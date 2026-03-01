# 한국 웹소설 제목 정렬 게임

한국 웹소설(문피아, 카카오페이지, 네이버 시리즈 등)의 제목을 토큰으로 분리하고
뒤섞은 뒤, 플레이어가 올바른 순서로 재배열하는 퍼즐 게임.
일본 나로우(なろう) 소설 제목 정렬 게임의 한국어 버전.

## 참조 문서 (작업 전 반드시 읽을 것)

| 문서 | 용도 |
|------|------|
| @docs/game-implementation-guide.md | 게임 전체 구현 명세 (컴포넌트, 상태, 채점 로직) |
| @docs/wrong-answer-sharing-spec.md | 오답 공유 기능 명세 |
| @docs/ux-improvements-spec.md | UX 개선 기능 명세 1차 (섹션 1 폐기됨 — ux-improvements-spec-2.md 참고) |
| @docs/ux-improvements-spec-2.md | UX 개선 기능 명세 2차 (드래그 이동, 드래그 중 스크롤 억제, "틀려도 괜찮아" 가로 넘침 수정, 결과 화면 제목 구글 검색) |
| @docs/token_split_rules.docx | 토큰 분리 규칙 (쉬움/어려움 난이도) |

## 기술 스택

- **프론트엔드:** React 18 + TypeScript + Vite + Tailwind CSS
- **상태 관리:** useReducer + useContext
- **백엔드:** Vercel Functions (api/*.ts)
- **DB:** Supabase (PostgreSQL)
- **배포:** Vercel

## 디렉토리 구조

```
src/
├── components/       # UI 컴포넌트
├── context/          # 전역 게임 상태 (GameContext.tsx)
├── hooks/            # useGameLogic.ts, useTimer.ts
├── utils/            # shuffle.ts, score.ts, userUuid.ts
├── types/            # index.ts (TypeScript 타입 전체)
└── data/             # questions.json (문제 데이터)
api/
├── wrong-answers.ts  # 오답 저장 / 조회
├── likes.ts          # 좋아요 추가 / 취소
└── health.ts         # Supabase 비활성 방지 ping
docs/                 # 위 참조 문서들
```

## 주요 명령어

```bash
vercel dev      # 로컬 개발 (Vercel Functions 포함) — npm run dev 사용 금지
npm run build   # 프로덕션 빌드
npm run lint    # ESLint
```

## 환경변수

`.env.local` 파일에 저장 (Git 커밋 금지):

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # 절대 프론트엔드에 노출 금지
```

## 코드 규칙

- TypeScript strict 모드, `any` 타입 금지
- 컴포넌트는 named export 사용
- 토큰은 반드시 고유 `id`로 식별 (`text` 기준 구별 금지)
- API 입력값은 `zod`로 서버에서 검증
- `service_role key`는 Vercel Functions 내부에서만 사용

## 백엔드 개발 규칙

- 모든 API는 `api/` 폴더에 위치
- 프론트엔드는 `/api/*` 경로로만 Supabase에 접근 (직접 접근 금지)
- Rate limit: `@upstash/ratelimit` 사용 (오답 저장 분당 20회, 좋아요 분당 30회)
- 오답 저장은 게임 진행을 블로킹하지 않음 (fire-and-forget, 에러는 console.error)
- 좋아요는 낙관적 업데이트 후 실패 시 롤백
- `GET /api/wrong-answers`는 `random=true` 파라미터 지원 — `ORDER BY RANDOM()` 적용하여 랜덤 샘플링

## Supabase 테이블

- `wrong_answers`: question_id, user_uuid, answer_tokens(JSONB), correct_tokens(JSONB), difficulty
- `likes`: wrong_answer_id, user_uuid
- 두 테이블 모두 RLS 활성화, SELECT만 공개, INSERT/DELETE는 서버 경유
- UNIQUE 제약으로 중복 저장 및 중복 좋아요 DB 레벨에서 방어

## 유저 식별

로그인 없음. `localStorage`에 저장된 익명 UUID(`novel_game_user_uuid`)로 식별.
`src/utils/userUuid.ts`의 `getUserUuid()` 함수 사용.

## 게임 상수

게임 로직에서 숫자를 하드코딩하지 않는다. 아래 상수를 사용할 것.

- 총 문제 수: `state.totalQuestions` (기본값 10, 5문제 단위로 사용자가 설정)
- 문제 수 선택지: `[5, 10, 15, 20]`
- 타임어택 제한 시간: `30`초 (상수로 관리)
- 타이머 경고 임계값: `5`초 이하 시 빨간색 표시

점수 등급은 절대값이 아닌 **비율 기준**으로 판정한다. (`totalScore / totalQuestions`)

## 모바일 개발 규칙

- 토큰 인터랙션은 **드래그(HTML5 DnD API) + 클릭(onClick) 모두 지원**
  - 외부 DnD 라이브러리(`react-dnd`, `dnd-kit` 등) 도입 금지 — 브라우저 내장 API 사용
- 드래그 중에만 최상위 컨테이너에 `touch-action: none` 동적 적용 → 드래그 종료 시 반드시 `auto`로 복원
- 오답 토큰 목록 컨테이너에 반드시 `flex-wrap w-full max-w-full overflow-hidden` 적용
- 최소 지원 너비: 375px

## 컴포넌트 추가 규칙

- 재사용 가능한 UI(예: 확인 다이얼로그)는 별도 컴포넌트로 분리
- SetupScreen 내 탭 전환 상태는 로컬 `useState`로 관리 (`GameState`에 추가 금지)
- 사람이 직접 수정할 텍스트(정보 탭 등)는 해당 컴포넌트에 하드코딩

## 운영 주의사항

- Supabase 무료 플랜: 7일 비활성 시 자동 중지 → `/api/health` Cron으로 방지
- Vercel Hobby 무료 플랜: Functions 월 15만 회 한도
- Supabase DB 무료 한도: 500MB (오답 1건 ≈ 250B → 약 200만 건 저장 가능)
- 일 활성 유저 500명 초과 시 유료 플랜 전환 검토
