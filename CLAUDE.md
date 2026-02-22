# 한국 웹소설 제목 정렬 게임

## 프로젝트 개요
한국 웹소설 제목을 토큰으로 분리한 뒤 플레이어가 올바른 순서로 
재배열하는 퍼즐 게임. 일본 나로우(なろう) 소설 정렬 게임의 한국어 버전.

## 참조 문서
구현 전 반드시 아래 문서를 먼저 읽을 것:
- @docs/game-implementation-guide.md — 전체 구현 명세 (컴포넌트, 상태, 로직)
- @docs/token_split_rules.docx      — 토큰 분리 규칙 (쉬움/어려움 난이도)

## 기술 스택
- React 18 + TypeScript + Vite
- Tailwind CSS
- 상태 관리: useReducer + useContext
- 배포: Vercel

## 주요 명령어
- `npm run dev`   : 개발 서버 실행
- `npm run build` : 프로덕션 빌드
- `npm run lint`  : ESLint 검사

## 디렉토리 구조
- `src/components/` : UI 컴포넌트
- `src/context/`    : 전역 게임 상태
- `src/hooks/`      : 커스텀 훅
- `src/utils/`      : 셔플, 채점, 토큰화 유틸
- `src/data/`       : questions.json 문제 데이터

## 코드 규칙
- TypeScript strict 모드, any 타입 금지
- 컴포넌트는 named export 사용
- 토큰은 반드시 고유 id로 식별 (text로 구별 금지)
- 채점 시점: 정답 확인 버튼 클릭 시점의 inputTokens 기준