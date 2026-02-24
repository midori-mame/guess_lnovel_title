# 오답 공유 기능 구현 명세서

> **오늘 개발할 범위:** 오답 저장 → 결과 화면에 다른 유저 오답 표시 → 오답 좋아요  
> 기존 게임 구현 가이드(`game-implementation-guide.md`)를 먼저 숙지한 뒤 이 문서를 읽을 것.

---

## 목차

1. [기능 개요](#1-기능-개요)
2. [인프라 구성](#2-인프라-구성)
3. [DB 스키마](#3-db-스키마)
4. [익명 유저 식별](#4-익명-유저-식별)
5. [API 명세](#5-api-명세)
6. [프론트엔드 변경 사항](#6-프론트엔드-변경-사항)
7. [보안 규칙](#7-보안-규칙)
8. [구현 순서](#8-구현-순서)
9. [주의사항 및 엣지 케이스](#9-주의사항-및-엣지-케이스)

---

## 1. 기능 개요

### 기능 (1) — 오답 저장

`정답 확인` 버튼 클릭 시 채점 결과가 오답(score < 1.0)이면 서버에 기록한다.  
스킵은 저장하지 않는다.

### 기능 (2) — 결과 화면에 다른 유저 오답 표시

10문제 완료 후 결과 화면이 열릴 때, 내가 틀린 문제들에 대해 다른 유저들의 오답 목록을 조회하여 표시한다.

표시 형태:
```
📋 파혼당한 공녀가 복수를 결심했다
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
다른 유저들은 이렇게 틀렸어요!

① [파혼당한] [복수를] [공녀가] [결심했다]   👍 12
② [공녀가] [파혼당한] [결심했다] [복수를]   👍 3
   ↑ 나도 이렇게 틀렸어요!
```

- 문제당 최대 5개, 좋아요 수 내림차순 정렬
- 내 오답과 동일한 항목에는 "나도 이렇게 틀렸어요!" 뱃지 표시
- 본인이 제출한 오답에는 좋아요 버튼 비활성화

### 기능 (3) — 오답 좋아요

- 결과 화면에서만 좋아요 가능
- 같은 오답에 한 번만 누를 수 있으며, 다시 누르면 취소(토글)
- 본인 오답에는 좋아요 불가
- 버튼 클릭 시 UI를 즉시 업데이트(낙관적 업데이트) 후 서버 반영, 실패 시 롤백

---

## 2. 인프라 구성

```
[React 프론트엔드]
       │
       │ fetch /api/*
       ▼
[Vercel Functions]   /api/wrong-answers.ts
                     /api/likes.ts
       │
       │ service_role key (서버 전용)
       ▼
[Supabase PostgreSQL]
  wrong_answers 테이블
  likes 테이블
```

### 환경변수 (Vercel Dashboard → Settings → Environment Variables)

| 키 | 설명 | 노출 범위 |
|----|------|-----------|
| `SUPABASE_URL` | Supabase 프로젝트 URL | 서버 전용 |
| `SUPABASE_SERVICE_ROLE_KEY` | 관리자 키 — 절대 프론트엔드에 노출 금지 | 서버 전용 |

로컬 개발 시 `.env.local` 파일에 동일한 키를 저장하고, `.gitignore`에 반드시 추가한다.

### 로컬 실행

```bash
vercel dev   # 반드시 이 명령어 사용. npm run dev 로는 Functions가 실행되지 않음
```

---

## 3. DB 스키마

Supabase SQL Editor에서 아래 순서로 실행한다.

### 3-1. wrong_answers 테이블

```sql
CREATE TABLE wrong_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     INTEGER NOT NULL,
  user_uuid       TEXT NOT NULL,
  answer_tokens   JSONB NOT NULL,          -- 유저가 제출한 토큰 배열
  correct_tokens  JSONB NOT NULL,          -- 정답 토큰 배열 (복기용)
  difficulty      TEXT NOT NULL CHECK (difficulty IN ('easy', 'hard')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 유저가 같은 문제에 동일한 오답을 중복 저장하지 못하도록
  UNIQUE (question_id, user_uuid, answer_tokens)
);
```

### 3-2. likes 테이블

```sql
CREATE TABLE likes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wrong_answer_id UUID NOT NULL REFERENCES wrong_answers(id) ON DELETE CASCADE,
  user_uuid       TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- 한 유저가 같은 오답에 중복 좋아요 방지
  UNIQUE (wrong_answer_id, user_uuid)
);
```

### 3-3. 인덱스

```sql
-- 문제별 오답 조회 성능
CREATE INDEX idx_wrong_answers_question_id ON wrong_answers(question_id);

-- 좋아요 수 집계 성능
CREATE INDEX idx_likes_wrong_answer_id ON likes(wrong_answer_id);
```

### 3-4. Row Level Security (RLS)

```sql
-- RLS 활성화
ALTER TABLE wrong_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- wrong_answers: 누구나 읽기 가능, 쓰기는 서버(service_role)만 가능
CREATE POLICY "wrong_answers_read" ON wrong_answers
  FOR SELECT USING (true);

-- likes: 누구나 읽기 가능, 쓰기는 서버(service_role)만 가능
CREATE POLICY "likes_read" ON likes
  FOR SELECT USING (true);

-- service_role key를 사용하는 서버는 RLS를 우회하므로
-- INSERT/UPDATE/DELETE는 Vercel Functions에서만 처리됨
```

---

## 4. 익명 유저 식별

로그인 없이 유저를 구별하기 위해 브라우저 `localStorage`에 UUID를 저장한다.

### 생성 규칙

```typescript
// src/utils/userUuid.ts

const USER_UUID_KEY = "novel_game_user_uuid";

export function getUserUuid(): string {
  let uuid = localStorage.getItem(USER_UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(USER_UUID_KEY, uuid);
  }
  return uuid;
}
```

### 특성 및 한계

- 같은 브라우저에서는 동일한 UUID가 유지된다.
- 시크릿 모드, 브라우저 데이터 삭제, 다른 기기에서는 새 UUID가 생성된다.
- 이 UUID는 서버로 전송되며 Supabase DB에 저장된다.
- **개인정보가 아니므로 별도 동의 처리는 불필요**하지만, 개인 식별이 불가능한 익명 데이터임을 코드 주석에 명시한다.

---

## 5. API 명세

### 5-1. POST /api/wrong-answers — 오답 저장

**호출 시점:** `정답 확인` 버튼 클릭 후 채점 결과가 오답(score < 1.0)일 때

**Request Body:**

```typescript
{
  questionId:    number;    // 문제 ID (questions.json의 id)
  userUuid:      string;    // 익명 유저 UUID (localStorage)
  answerTokens:  string[];  // 유저가 제출한 토큰 배열
  correctTokens: string[];  // 정답 토큰 배열
  difficulty:    "easy" | "hard";
}
```

**Response:**

```typescript
// 성공 (201 Created 또는 200 OK — 이미 존재하면 기존 항목 반환)
{
  id:            string;   // wrong_answer UUID
  alreadyExists: boolean;  // true면 중복 저장 시도였음
}

// 실패 (400 Bad Request)
{ error: string }

// 실패 (429 Too Many Requests)
{ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }
```

**서버 처리 순서:**

1. zod로 Request Body 유효성 검증
2. Rate limit 확인 (IP 기준, 1분에 20회 초과 시 429)
3. `questionId`가 questions.json에 실제로 존재하는지 확인
4. `answerTokens` 배열이 해당 문제의 토큰 목록 범위 안에 있는지 확인
5. Supabase INSERT (UNIQUE 제약으로 중복 저장 자동 방어)
6. 결과 반환

---

### 5-2. GET /api/wrong-answers?questionIds=1,3,7 — 오답 목록 조회

**호출 시점:** 결과 화면(`ResultScreen`) 진입 시, 내가 틀린 문제 id 목록을 전달

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `questionIds` | string | 쉼표로 구분된 문제 ID 목록 (예: `"1,3,7"`) |
| `userUuid` | string | 내 UUID (본인 오답 구별용) |
| `difficulty` | string | `"easy"` 또는 `"hard"` |

**Response:**

```typescript
{
  [questionId: number]: {
    wrongAnswers: {
      id:           string;    // wrong_answer UUID
      answerTokens: string[];  // 오답 토큰 배열
      likesCount:   number;    // 좋아요 수
      isMyAnswer:   boolean;   // 내가 제출한 오답인지 여부
      iLiked:       boolean;   // 내가 좋아요를 눌렀는지 여부
    }[];
  }
}
```

**정렬 및 필터:**
- 좋아요 수 내림차순, 동점이면 최신순
- 문제당 최대 5개 반환
- **본인 오답도 목록에 포함**되지만 `isMyAnswer: true`로 표시됨

---

### 5-3. POST /api/likes — 좋아요 추가/취소

**호출 시점:** 결과 화면에서 좋아요 버튼 클릭 시

**Request Body:**

```typescript
{
  wrongAnswerId: string;  // wrong_answer UUID
  userUuid:      string;  // 익명 유저 UUID
}
```

**Response:**

```typescript
// 성공
{
  action:     "liked" | "unliked";  // 추가됐는지 취소됐는지
  likesCount: number;               // 업데이트된 좋아요 수
}

// 실패 — 본인 오답에 좋아요 시도
{ error: "본인의 오답에는 좋아요를 누를 수 없습니다." }

// 실패 (429)
{ error: "요청이 너무 많습니다." }
```

**서버 처리 순서:**

1. zod로 유효성 검증
2. Rate limit 확인 (IP 기준, 1분에 30회 초과 시 429)
3. `wrong_answer_id`로 해당 오답의 `user_uuid` 조회
4. 요청자의 `userUuid`와 동일하면 403 반환 (본인 오답 좋아요 방지)
5. `likes` 테이블에 해당 `(wrong_answer_id, user_uuid)` 조합 존재 여부 확인
6. 존재하면 DELETE (좋아요 취소), 없으면 INSERT (좋아요 추가)
7. 현재 좋아요 수 COUNT 후 반환

---

## 6. 프론트엔드 변경 사항

### 6-1. 추가되는 타입 (`types/index.ts`에 추가)

```typescript
interface WrongAnswerEntry {
  id:           string;
  answerTokens: string[];
  likesCount:   number;
  isMyAnswer:   boolean;
  iLiked:       boolean;
}

interface OtherWrongAnswers {
  [questionId: number]: WrongAnswerEntry[];
}
```

### 6-2. 오답 저장 호출 위치

`useGameLogic.ts`의 채점 처리 부분에 추가한다.

```
정답 확인 클릭
  → 채점 (기존 로직)
  → score < 1.0 이면 → POST /api/wrong-answers 호출 (fire-and-forget)
  → 다음 문제 로드 (기존 로직)
```

- 오답 저장 API 호출은 게임 진행을 블로킹하지 않는다.
- API 실패해도 게임은 정상 진행되며, 콘솔에만 에러를 출력한다.

### 6-3. ResultScreen 변경

결과 화면 진입 시 오답 목록 조회 → 기존 복기 목록 아래에 "다른 유저들의 오답" 섹션 추가.

**로딩 순서:**
1. 결과 화면 진입
2. 기존 내 복기 목록 즉시 표시 (로딩 없음)
3. GET /api/wrong-answers 호출 (비동기)
4. 응답 도착 시 각 문제 복기 아래에 오답 목록 삽입
5. 로딩 중에는 스켈레톤 UI 표시

**좋아요 버튼 UX (낙관적 업데이트):**
```
버튼 클릭
  → 즉시 UI 업데이트 (likesCount ±1, iLiked 토글)
  → POST /api/likes 호출
  → 성공: 서버 반환값으로 likesCount 최종 반영
  → 실패: 원래 상태로 롤백 + 토스트 메시지
```

### 6-4. 새로운 컴포넌트

**`<OtherWrongAnswers />`**

```
Props:
  questionId:   number
  title:        string        // 문제 제목 (헤더 표시용)
  entries:      WrongAnswerEntry[]
  isLoading:    boolean
  userUuid:     string

표시 요소:
  - 섹션 제목: "다른 유저들은 이렇게 틀렸어요!"
  - 로딩 중: 스켈레톤 3줄
  - 오답 없음: "아직 다른 유저의 오답이 없어요."
  - 오답 목록:
      - 순위 번호
      - 토큰 카드 배열 (클릭 불가, 읽기 전용)
      - "나도 이렇게 틀렸어요!" 뱃지 (isMyAnswer === true)
      - 좋아요 버튼 + 좋아요 수
        (isMyAnswer === true 이면 버튼 비활성화)
```

---

## 7. 보안 규칙

| 위협 | 방어 수단 |
|------|-----------|
| 오답 스팸 삽입 | Rate limit (IP 기준 분당 20회) + zod 입력 검증 |
| 좋아요 어뷰징 | Rate limit (분당 30회) + DB UNIQUE 제약 |
| 본인 오답 자좋아요 | 서버에서 wrong_answer의 user_uuid와 비교 후 거부 |
| DB 용량 고갈 | questionId 유효성 검증으로 존재하지 않는 문제에 저장 방지 |
| API 키 노출 | service_role key는 Vercel Functions 내부에서만 사용, 프론트엔드에 미전달 |
| Supabase 직접 접근 | RLS 정책으로 SELECT만 허용, INSERT/DELETE는 서버 경유만 허용 |

---

## 8. 구현 순서

아래 순서로 개발한다. 각 단계를 완료한 후 다음 단계로 넘어갈 것.

```
[1단계] Supabase 설정
  → wrong_answers, likes 테이블 생성
  → 인덱스 생성
  → RLS 정책 적용
  → .env.local 에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 등록

[2단계] 유저 UUID 유틸 구현
  → src/utils/userUuid.ts 작성
  → getUserUuid() 함수 동작 확인

[3단계] POST /api/wrong-answers 구현 및 테스트
  → vercel dev 실행
  → curl 또는 Postman으로 직접 호출하여 Supabase에 데이터 저장 확인
  → 중복 저장 방어 확인 (같은 body 두 번 전송 시 alreadyExists: true)

[4단계] useGameLogic.ts 에 오답 저장 호출 연동
  → 게임 플레이 후 Supabase Table Editor에서 실제 저장 확인

[5단계] GET /api/wrong-answers 구현 및 테스트
  → 3단계에서 저장한 데이터가 올바르게 조회되는지 확인
  → isMyAnswer, iLiked 필드 정확성 확인

[6단계] ResultScreen에 OtherWrongAnswers 컴포넌트 연동
  → 로딩 상태, 빈 상태, 정상 표시 상태 모두 확인

[7단계] POST /api/likes 구현 및 테스트
  → 좋아요 추가/취소 토글 확인
  → 본인 오답 좋아요 방지 확인

[8단계] 좋아요 버튼 낙관적 업데이트 구현
  → 클릭 즉시 UI 반응 확인
  → API 실패 시 롤백 확인

[9단계] Rate limit 적용
  → @upstash/ratelimit + Upstash Redis 설정
  → 한도 초과 시 429 응답 확인
```

---

## 9. 주의사항 및 엣지 케이스

**오답 저장 타이밍**
채점 직후 바로 저장 API를 호출하되, 게임 진행(다음 문제 로드)을 블로킹하지 않는다. `await` 없이 호출하되 에러는 콘솔에 출력한다.

**결과 화면에서 내 오답이 목록에 포함되는 경우**
내 오답도 목록에 보이지만 `isMyAnswer: true`로 표시하고 좋아요 버튼을 비활성화한다. "나도 이렇게 틀렸어요!" 뱃지를 통해 시각적으로 구별한다.

**오답이 0개인 경우**
해당 문제 섹션에 "아직 다른 유저의 오답이 없어요." 메시지를 표시한다. 빈 섹션을 숨기지 않는다 (존재 자체가 정보이므로).

**Supabase 비활성 자동 중지 방지**
Vercel Cron Job을 설정하여 매일 Supabase에 가벼운 쿼리를 전송한다. `vercel.json`에 아래를 추가한다.

```json
{
  "crons": [{
    "path": "/api/health",
    "schedule": "0 9 * * *"
  }]
}
```

`/api/health.ts`에서 Supabase에 `SELECT 1` 쿼리를 실행한다.

**answerTokens 배열 비교**
JSONB 타입의 배열 동일 여부는 순서까지 고려한다. `["A","B"]`와 `["B","A"]`는 다른 오답이다. Supabase의 JSONB UNIQUE 제약은 순서를 포함한 완전 일치를 기준으로 하므로 별도 처리가 필요 없다.

**문제 풀이 완료 전 결과 화면 진입 방지**
10문제를 모두 완료한 경우에만 결과 화면으로 전이되므로, 오답 조회 API 호출 시 항상 유효한 questionIds가 전달된다. 단, questionIds가 빈 배열인 경우(전부 정답)에는 API를 호출하지 않는다.
