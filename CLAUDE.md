# 제목이 너무 길어: 문장형 소설 제목 정렬 게임

라이트노벨의 제목을 토큰으로 분리하고
뒤섞은 뒤, 플레이어가 올바른 순서로 재배열하는 퍼즐 게임.
일본 나로우(なろう) 소설 제목 정렬 게임의 한국어 버전.

## 참조 문서 (작업 전 반드시 읽을 것)

| 문서 | 용도 |
|------|------|
| @docs/game-implementation-guide.md | 게임 전체 구현 명세 (컴포넌트, 상태, 채점 로직) |
| @docs/wrong-answer-sharing-spec.md | 오답 공유 기능 명세 (오늘 개발 범위) |
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

## Supabase 테이블

- `wrong_answers`: question_id, user_uuid, answer_tokens(JSONB), correct_tokens(JSONB), difficulty
- `likes`: wrong_answer_id, user_uuid
- 두 테이블 모두 RLS 활성화, SELECT만 공개, INSERT/DELETE는 서버 경유
- UNIQUE 제약으로 중복 저장 및 중복 좋아요 DB 레벨에서 방어

## 유저 식별

로그인 없음. `localStorage`에 저장된 익명 UUID(`novel_game_user_uuid`)로 식별.
`src/utils/userUuid.ts`의 `getUserUuid()` 함수 사용.

## 운영 주의사항

- Supabase 무료 플랜: 7일 비활성 시 자동 중지 → `/api/health` Cron으로 방지
- Vercel Hobby 무료 플랜: Functions 월 15만 회 한도
- Supabase DB 무료 한도: 500MB (오답 1건 ≈ 250B → 약 200만 건 저장 가능)
- 일 활성 유저 500명 초과 시 유료 플랜 전환 검토
