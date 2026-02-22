# 한국 웹소설 제목 정렬 게임 — Agent 구현 가이드

> 이 문서는 일본 나로우(なろう) 소설 제목 정렬 게임의 한국어 버전을 구현하기 위한 Agent용 참조 가이드입니다.  
> 데이터 구조, 게임 로직, UI 컴포넌트, 토큰 분리 규칙을 모두 포함합니다.

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [디렉토리 구조](#3-디렉토리-구조)
4. [데이터 구조](#4-데이터-구조)
5. [토큰 분리 규칙](#5-토큰-분리-규칙)
6. [게임 설정 옵션](#6-게임-설정-옵션)
7. [게임 상태 (State)](#7-게임-상태-state)
8. [게임 흐름](#8-게임-흐름)
9. [핵심 로직](#9-핵심-로직)
10. [UI 컴포넌트 명세](#10-ui-컴포넌트-명세)
11. [채점 방식](#11-채점-방식)
12. [간단 모드 (힌트 시스템)](#12-간단-모드-힌트-시스템)
13. [타임어택 모드](#13-타임어택-모드)
14. [결과 화면](#14-결과-화면)
15. [구현 시 주의사항](#15-구현-시-주의사항)

---

## 1. 프로젝트 개요

한국 웹소설(카카오페이지, 문피아, 네이버 시리즈 등)의 제목을 **토큰 단위로 분리하여 뒤섞은 뒤**, 플레이어가 올바른 순서로 재배열하는 퍼즐 게임입니다.

### 핵심 컨셉
- 소설 제목을 단어 또는 형태소 단위로 분리한 **토큰 카드**를 화면에 무작위로 제시
- 플레이어는 토큰 카드를 클릭하여 **입력 영역에 순서대로 배치**
- 정답(원본 제목)과 일치하는지 채점
- 총 10문제를 풀고 최종 점수를 확인

---

## 2. 기술 스택

| 항목 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | React 18 | Vite 기반 |
| 언어 | TypeScript | 타입 안전성 확보 |
| 스타일링 | Tailwind CSS | 유틸리티 클래스 |
| 상태 관리 | React `useReducer` + `useContext` | 전역 게임 상태 |
| 데이터 | 로컬 JSON 파일 | `/src/data/questions.json` |
| 배포 | Vercel | |

---

## 3. 디렉토리 구조

```
src/
├── components/
│   ├── GameHeader.tsx        # 상단 상태바 (진행도, 점수, 토글)
│   ├── InputArea.tsx         # 토큰 배치 영역 (점선 박스)
│   ├── TokenPool.tsx         # 선택 가능한 토큰 카드 영역
│   ├── ActionButtons.tsx     # 초기화 / 정답 확인 / 스킵 버튼
│   ├── ResultScreen.tsx      # 최종 결과 화면
│   └── SetupScreen.tsx       # 게임 시작 전 설정 화면
├── context/
│   └── GameContext.tsx       # 전역 게임 상태 및 dispatch
├── hooks/
│   ├── useGameLogic.ts       # 채점, 셔플, 스킵 등 핵심 로직
│   └── useTimer.ts           # 타임어택 모드 타이머
├── data/
│   └── questions.json        # 문제 데이터
├── types/
│   └── index.ts              # TypeScript 타입 정의
└── utils/
    ├── shuffle.ts            # Fisher-Yates 셔플
    ├── tokenize.ts           # 토큰 분리 유틸
    └── score.ts              # 채점 로직
```

---

## 4. 데이터 구조

### 4-1. 문제 데이터 (`questions.json`)

```json
[
  {
    "id": 1,
    "title": "파혼당한 공녀가 복수를 결심했다",
    "difficulty": "easy",
    "tokens": {
      "easy": ["파혼당한", "공녀가", "복수를", "결심했다"],
      "hard": ["파혼당", "한", "공녀", "가", "복수", "를", "결심했", "다"]
    },
    "source": "카카오페이지",
    "hint": "공녀가 파혼 후 복수를 다짐하는 내용"
  }
]
```

### 4-2. TypeScript 타입 정의 (`types/index.ts`)

```typescript
// 난이도
type Difficulty = "easy" | "hard";

// 게임 모드
type GameMode = "normal" | "timeattack";

// 채점 모드
type ScoringMode = "exact" | "partial";

// 문제 데이터
interface Question {
  id: number;
  title: string;
  difficulty: Difficulty;
  tokens: {
    easy: string[];
    hard: string[];
  };
  source?: string;
  hint?: string;
}

// 토큰 (게임 내 상태용)
interface Token {
  id: string;          // 고유 식별자 (예: "token-0", "token-1")
  text: string;        // 표시 텍스트
  color: string;       // Tailwind 색상 클래스
  isPlaced: boolean;   // 입력 영역에 배치되었는지 여부
}

// 문제별 결과
interface QuestionResult {
  questionId: number;
  title: string;
  userAnswer: string[];
  correctAnswer: string[];
  score: number;         // 0.00 ~ 1.00
  timeSpent: number;     // 초 단위 (타임어택 모드)
  skipped: boolean;
}

// 전체 게임 상태
interface GameState {
  phase: "setup" | "playing" | "result";
  mode: GameMode;
  difficulty: Difficulty;
  scoringMode: ScoringMode;
  soundEnabled: boolean;
  easyModeEnabled: boolean;
  questions: Question[];
  currentIndex: number;          // 현재 문제 인덱스 (0~9)
  inputTokens: Token[];          // 입력 영역에 배치된 토큰
  poolTokens: Token[];           // 아직 선택되지 않은 토큰
  results: QuestionResult[];
  totalScore: number;
  timeLeft: number;              // 타임어택 모드 남은 시간(초)
}
```

---

## 5. 토큰 분리 규칙

### 5-1. 공통 원칙 (모든 난이도)

- 토큰을 전부 합쳤을 때 **원본 제목과 공백까지 포함하여 동일**해야 합니다.
  - 단, 공백 자체는 토큰에 포함하지 않으며 표시 시에는 토큰 사이에 자동으로 공백을 추가합니다.
- 문장부호(`!`, `?`, `,`, `(`, `)` 등)는 **앞 단어와 함께 하나의 토큰**으로 묶습니다.
- 고유명사(인명·지명·작품명) 내부는 어떤 난이도에서도 **추가 분리하지 않습니다.**
- 줄임말·신조어(예: `레벨업`, `OP`, `먹방`)는 **단독 토큰**으로 유지합니다.

### 5-2. 쉬움 (Easy) — 어절 단위 분리

**규칙:** 원본 제목의 **공백(띄어쓰기)을 기준으로 split**합니다.

```
"나는 여기서 죽는다"
→ ["나는", "여기서", "죽는다"]

"파혼당한 공녀가 복수를 결심했다"
→ ["파혼당한", "공녀가", "복수를", "결심했다"]

"전생했더니 마왕의 딸이었다"
→ ["전생했더니", "마왕의", "딸이었다"]
```

> **포인트:** 조사·어미가 앞 단어에 붙어 있어도 그대로 하나의 토큰입니다.

### 5-3. 어려움 (Hard) — 형태소 단위 분리

**규칙:** 각 어절을 다시 **실질 형태소**와 **기능 형태소**로 분리합니다.

#### ① 체언(명사·대명사·수사) + 조사 분리

분리 대상 조사: `은/는`, `이/가`, `을/를`, `의`, `에`, `에서(서)`, `에게`, `로/으로`, `과/와`, `도`, `만`, `까지`, `부터`, `처럼`, `보다`, `한테`, `이란/란`

```
"나는"      → ["나", "는"]
"공녀가"    → ["공녀", "가"]
"마왕의"    → ["마왕", "의"]
"복수를"    → ["복수", "를"]
"여기서"    → ["여기", "서"]
```

#### ② 용언(동사·형용사) 어간 + 어미 분리

어미가 여러 겹으로 붙은 경우, **전체 어미 덩어리를 하나의 토큰**으로 묶습니다.

```
"죽는다"      → ["죽", "는다"]
"결심했다"    → ["결심했", "다"]
"전생했더니"  → ["전생했", "더니"]
"이었다"      → ["이었", "다"]
"복수하기로"  → ["복수하", "기로"]
```

#### ③ 접속사·부사는 단독 토큰

```
"그리고 나는"  → ["그리고", "나", "는"]
"결국 마왕이"  → ["결국", "마왕", "이"]
```

#### 종합 예시

```
"나는 여기서 죽는다"
→ ["나", "는", "여기", "서", "죽", "는다"]

"파혼당한 공녀가 복수를 결심했다"
→ ["파혼당", "한", "공녀", "가", "복수", "를", "결심했", "다"]

"전생했더니 마왕의 딸이었다"
→ ["전생했", "더니", "마왕", "의", "딸", "이었", "다"]
```

### 5-4. Agent 검증 조건

토큰 생성 후 반드시 아래 조건을 자체 검증하세요.

```typescript
// 토큰을 합쳤을 때 원본 제목의 공백 제거 결과와 동일해야 함
const isValid = tokens.join("") === title.replace(/\s/g, "");
```

---

## 6. 게임 설정 옵션

플레이 시작 전 SetupScreen에서 아래 옵션을 선택합니다.

| 설정 | 선택지 | 기본값 |
|------|--------|--------|
| 게임 모드 | 통상 모드 / 타임어택 모드 | 통상 모드 |
| 난이도 | 쉬움 / 어려움 | 쉬움 |
| 채점 방식 | 완답만 / 부분 점수 | 완답만 |

---

## 7. 게임 상태 (State)

### 초기 상태

```typescript
const initialState: GameState = {
  phase: "setup",
  mode: "normal",
  difficulty: "easy",
  scoringMode: "exact",
  soundEnabled: true,
  easyModeEnabled: false,
  questions: [],
  currentIndex: 0,
  inputTokens: [],
  poolTokens: [],
  results: [],
  totalScore: 0,
  timeLeft: 30,
};
```

### State 전이 규칙

```
setup
  → [START 버튼 클릭]
  → playing (문제 1/10 로드, 토큰 셔플)

playing
  → [정답 확인 클릭] → 채점 → 다음 문제 로드 or result
  → [스킵 클릭]     → 0점 처리 → 다음 문제 로드 or result
  → [타임어택: 시간 만료] → 0점 처리 → 다음 문제 로드 or result
  → [마지막 문제 완료] → result

result
  → [다시 시작 클릭] → setup
```

---

## 8. 게임 흐름

### 8-1. 문제 로드 순서

1. `questions.json`에서 선택한 난이도에 맞는 문제 10개를 **무작위 선택**합니다.
2. 선택된 문제의 `tokens[difficulty]` 배열을 가져옵니다.
3. 각 토큰에 **고유 id**와 **색상**을 부여합니다. (중복 텍스트 토큰 구별용)
4. 토큰 배열을 **Fisher-Yates 셔플**하여 `poolTokens`에 저장합니다.
5. `inputTokens`는 빈 배열로 초기화합니다.

### 8-2. 토큰 색상 부여 규칙

토큰에 색상을 순환 배정하여 시각적으로 구별합니다. 아래 색상 팔레트를 순서대로 순환합니다.

```typescript
const TOKEN_COLORS = [
  "bg-red-200",
  "bg-blue-200",
  "bg-green-200",
  "bg-yellow-200",
  "bg-purple-200",
  "bg-pink-200",
  "bg-orange-200",
  "bg-teal-200",
];

// 토큰 인덱스 % TOKEN_COLORS.length 로 색상 배정
```

### 8-3. 플레이어 인터랙션

#### 토큰 선택 (풀 → 입력 영역)
- 플레이어가 `TokenPool`의 토큰 카드를 클릭합니다.
- 해당 토큰이 `poolTokens`에서 제거되고 `inputTokens`의 **끝에 추가**됩니다.

#### 토큰 취소 (입력 영역 → 풀)
- 플레이어가 `InputArea`의 토큰 카드를 클릭합니다.
- 해당 토큰이 `inputTokens`에서 제거되고 `poolTokens`의 **끝에 추가**됩니다.

#### 초기화 (클리어)
- `inputTokens`의 모든 토큰을 `poolTokens`로 이동합니다.
- `poolTokens`를 다시 셔플하지 않고 기존 순서 유지 + 반환된 토큰은 끝에 추가합니다.

---

## 9. 핵심 로직

### 9-1. Fisher-Yates 셔플 (`utils/shuffle.ts`)

```typescript
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

### 9-2. 토큰 ID 생성

동일한 텍스트의 토큰이 여러 개 존재할 수 있으므로 반드시 **고유 id**를 부여합니다.

```typescript
export function createTokens(rawTokens: string[]): Token[] {
  return rawTokens.map((text, index) => ({
    id: `token-${index}-${Date.now()}`,
    text,
    color: TOKEN_COLORS[index % TOKEN_COLORS.length],
    isPlaced: false,
  }));
}
```

### 9-3. 채점 로직 (`utils/score.ts`)

```typescript
// 완답 모드: 전체가 일치해야 1점
export function scoreExact(input: Token[], answer: string[]): number {
  const inputTexts = input.map(t => t.text);
  const isCorrect = inputTexts.length === answer.length &&
    inputTexts.every((text, i) => text === answer[i]);
  return isCorrect ? 1 : 0;
}

// 부분 점수 모드: 위치가 맞는 토큰 수 / 전체 토큰 수
export function scorePartial(input: Token[], answer: string[]): number {
  if (answer.length === 0) return 0;
  const correctCount = input.reduce((acc, token, i) => {
    return acc + (token.text === answer[i] ? 1 : 0);
  }, 0);
  return parseFloat((correctCount / answer.length).toFixed(2));
}
```

### 9-4. 총점 계산

총 10문제, 문제당 최대 1점, **소수점 2자리**로 표시합니다.

```typescript
export function calcTotalScore(results: QuestionResult[]): number {
  const sum = results.reduce((acc, r) => acc + r.score, 0);
  return parseFloat(sum.toFixed(2));
}
```

---

## 10. UI 컴포넌트 명세

### 10-1. `<SetupScreen />`

게임 시작 전 설정 선택 화면입니다.

**표시 요소:**
- 게임 제목 (한국 웹소설 제목 정렬 게임)
- 게임 모드 선택 버튼 (통상 모드 / 타임어택 모드)
- 난이도 선택 버튼 (쉬움 / 어려움)
- 채점 방식 선택 버튼 (완답만 / 부분 점수)
- 시작 버튼

**동작:** 시작 버튼 클릭 시 `phase: "playing"`으로 전이

---

### 10-2. `<GameHeader />`

게임 플레이 화면 상단 정보 표시 영역입니다.

**좌측 표시:**
- 현재 설정 뱃지 3개 (난이도, 채점 방식, 게임 모드)
- 문제 진행 상황 (`문제: 1/10`)

**우측 표시:**
- 현재 점수 (`현재 점수: 0.00`)
- 효과음 토글 스위치
- 간단 모드 토글 스위치
- 타임어택 모드일 경우: 남은 시간 카운트다운 표시

---

### 10-3. `<InputArea />`

플레이어가 토큰을 순서대로 배치하는 영역입니다.

**표시 요소:**
- 점선 테두리 박스
- 배치된 토큰 카드 (왼쪽부터 순서대로 나열)
- 아무것도 배치되지 않은 경우 안내 텍스트: `"토큰을 선택하세요"`

**동작:**
- 토큰 카드 클릭 → 해당 토큰을 `poolTokens`로 반환

---

### 10-4. `<TokenPool />`

선택 가능한 토큰 카드가 흩어져 있는 영역입니다.

**표시 요소:**
- 무작위 순서로 배열된 토큰 카드
- 각 카드는 고유 색상을 가짐
- 이미 선택된 토큰은 표시하지 않음 (또는 비활성화 처리)

**동작:**
- 토큰 카드 클릭 → `inputTokens`의 끝에 추가

---

### 10-5. `<ActionButtons />`

하단의 세 가지 액션 버튼 영역입니다.

| 버튼 | 색상 | 동작 |
|------|------|------|
| 초기화 (클리어) | 회색 | `inputTokens` 전체를 `poolTokens`로 반환 |
| 정답 확인 | 초록색 | 채점 실행 → 결과 저장 → 다음 문제 또는 result |
| 스킵 | 파란색 | 해당 문제 0점 처리 → 다음 문제 또는 result |

---

### 10-6. `<ResultScreen />`

10문제 완료 후 최종 결과를 보여주는 화면입니다.

**표시 요소:**
- 총점 (예: `7.50 / 10.00`)
- 정답률 (예: `75%`)
- 문제별 복기 목록:
  - 문제 번호, 원본 제목
  - 플레이어의 답 vs 정답 (틀린 위치 강조 표시)
  - 문제별 점수
- 다시 시작 버튼

---

## 11. 채점 방식

### 완답만 (Exact)

`inputTokens`의 텍스트 배열이 정답 토큰 배열과 **완전히 동일**할 때만 1점, 그렇지 않으면 0점입니다.

```
정답: ["나", "는", "여기", "서", "죽", "는다"]
입력: ["나", "는", "여기", "서", "죽", "는다"] → 1.00점
입력: ["나", "는", "여기", "서", "는다", "죽"] → 0.00점
```

### 부분 점수 (Partial)

각 위치(인덱스)에서 텍스트가 일치하는 토큰 수를 전체 토큰 수로 나눈 값입니다.

```
정답: ["나", "는", "여기", "서", "죽", "는다"]  (총 6개)
입력: ["나", "는", "여기", "죽", "서", "는다"]  (4개 일치)
→ 4 / 6 = 0.67점
```

> **주의:** 입력된 토큰 수가 정답 토큰 수보다 적으면 부족한 위치는 오답으로 처리합니다.

---

## 12. 간단 모드 (힌트 시스템)

게임 화면의 토글로 언제든지 ON/OFF 가능합니다.

### 간단 모드 ON 상태의 동작

- 첫 번째 토큰을 `poolTokens`에서 제거하고 `inputTokens`에 자동으로 배치합니다.
- `TokenPool` 위에 정답 토큰 수 힌트를 표시합니다. (예: `"총 6개의 토큰을 배열하세요"`)

### 간단 모드 토글 시 처리

- **OFF → ON:** 현재 `inputTokens`를 초기화하고 위 조건 적용
- **ON → OFF:** 현재 `inputTokens`를 초기화하고 토큰 전체를 `poolTokens`로 반환

---

## 13. 타임어택 모드

### 기본 설정

- 문제당 제한 시간: **30초** (기본값, 상수로 관리)
- 새 문제 로드 시 타이머 리셋

### 타이머 동작

```typescript
// useTimer.ts
export function useTimer(
  initialTime: number,
  onExpire: () => void,
  isActive: boolean
) {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    if (!isActive) return;
    if (timeLeft <= 0) {
      onExpire();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isActive]);

  return { timeLeft, reset: () => setTimeLeft(initialTime) };
}
```

### 시간 만료 처리

1. 현재 문제를 **0점(스킵)** 처리합니다.
2. 다음 문제를 로드하거나 result 화면으로 전이합니다.
3. `GameHeader`의 타이머 표시가 빨간색으로 변경 (잔여 시간 5초 이하 시)

---

## 14. 결과 화면

### 점수 등급 기준

| 점수 범위 | 등급 | 메시지 |
|-----------|------|--------|
| 9.00 ~ 10.00 | S | "완벽해요! 웹소설 박사님!" |
| 7.00 ~ 8.99 | A | "훌륭해요! 꽤 많이 읽으셨군요!" |
| 5.00 ~ 6.99 | B | "괜찮아요! 조금 더 읽어봐요!" |
| 3.00 ~ 4.99 | C | "분발이 필요해요!" |
| 0.00 ~ 2.99 | D | "웹소설 입문을 추천드려요!" |

### 복기 화면 토큰 표시 규칙

정답과 비교하여 각 토큰의 상태를 색상으로 표시합니다.

- **초록색:** 위치와 텍스트 모두 정답
- **빨간색:** 위치 또는 텍스트가 오답
- **회색:** 플레이어가 배치하지 않은 빈 위치 (정답 토큰 표시)

---

## 15. 구현 시 주의사항

### 토큰 식별

동일한 텍스트의 토큰이 한 문제에 2개 이상 존재할 수 있습니다. (예: `["는", "마왕", "의", "딸", "은"]`에서 조사 반복)  
반드시 **고유 id**로 토큰을 구별하고, `text`가 아닌 `id`를 기준으로 상태를 관리하세요.

### 채점 시점

`정답 확인` 버튼 클릭 시점의 `inputTokens`만을 기준으로 채점합니다.  
`inputTokens`의 길이가 정답 토큰 수보다 적은 경우에도 채점을 허용하되, 부족한 위치는 오답으로 처리합니다.

### 문제 선택

`questions.json`에서 선택한 난이도에 해당하는 문제 풀에서 **중복 없이 10개**를 무작위 선택합니다.  
문제 풀이 10개 미만인 경우 전체 문제를 사용합니다.

### 효과음

효과음은 Web Audio API 또는 간단한 `<audio>` 태그로 구현합니다.

- 토큰 클릭 시: 짧은 클릭음
- 정답 시: 성공음
- 오답 시: 실패음
- 스킵 시: 무음 처리

### 반응형

모바일(375px) 이상에서 정상 동작해야 합니다.  
`TokenPool`의 토큰 카드는 `flex-wrap`으로 줄바꿈 처리합니다.

---

*본 문서는 나로우 소설 제목 정렬 게임 한국어 버전 구현을 위한 Agent 참조 가이드입니다.*  
*토큰 분리 규칙의 상세 내용은 `token_split_rules.docx`를 함께 참고하세요.*
