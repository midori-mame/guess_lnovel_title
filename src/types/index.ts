// 난이도
export type Difficulty = "easy" | "hard";

// 게임 모드
export type GameMode = "normal" | "timeattack";

// 채점 모드
export type ScoringMode = "exact" | "partial";

// 게임 페이즈
export type GamePhase = "setup" | "playing" | "feedback" | "result";

// 문제 데이터
export interface Question {
  id: number;
  title: string;
  difficulty?: Difficulty;
  tokens: {
    easy: string[];
    hard: string[];
  };
  source?: string;
  hint?: string;
}

// 토큰 (게임 내 상태용)
export interface Token {
  id: string;          // 고유 식별자 (예: "token-0", "token-1")
  text: string;        // 표시 텍스트
  color: string;       // Tailwind 색상 클래스
  isPlaced: boolean;   // 입력 영역에 배치되었는지 여부
}

// 문제별 결과
export interface QuestionResult {
  questionId: number;
  title: string;
  userAnswer: string[];
  correctAnswer: string[];
  score: number;         // 0.00 ~ 1.00
  timeSpent: number;     // 초 단위 (타임어택 모드)
  skipped: boolean;
}

// 전체 게임 상태
export interface GameState {
  phase: GamePhase;
  mode: GameMode;
  difficulty: Difficulty;
  scoringMode: ScoringMode;
  soundEnabled: boolean;
  easyModeEnabled: boolean;
  questions: Question[];
  currentIndex: number;          // 현재 문제 인덱스 (0~N)
  inputTokens: Token[];          // 입력 영역에 배치된 토큰
  poolTokens: Token[];           // 아직 선택되지 않은 토큰
  results: QuestionResult[];
  lastResult: QuestionResult | null;  // 직전 문제 채점 결과 (feedback 페이즈용)
  totalScore: number;
  timeLeft: number;              // 타임어택 모드 남은 시간(초)
  totalQuestions: number;        // 이번 게임의 총 문제 수 (기본값: 10)
  isDragging: boolean;           // 드래그 중 여부 (드래그 중 touch-action 억제용)
}

// ─── 오답 공유 기능 타입 ───────────────────────────────────────

// 다른 유저의 오답 항목
export interface WrongAnswerEntry {
  id: string;            // wrong_answer UUID
  answerTokens: string[]; // 오답 토큰 배열
  likesCount: number;    // 좋아요 수
  isMyAnswer: boolean;   // 내가 제출한 오답인지 여부
  iLiked: boolean;       // 내가 좋아요를 눌렀는지 여부
}

// questionId → 오답 목록 맵
export interface OtherWrongAnswers {
  [questionId: number]: WrongAnswerEntry[];
}

// 메인 화면 피처드 오답 항목 (문제 제목 포함)
export interface FeaturedWrongAnswerEntry extends WrongAnswerEntry {
  questionId: number;
  title: string;
}

export interface FeaturedWrongAnswers {
  popular: FeaturedWrongAnswerEntry[];
  random: FeaturedWrongAnswerEntry[];
}

// ─── 게임 액션 타입 ───────────────────────────────────────────

// 게임 액션 타입
export type GameAction =
  | { type: "SET_MODE"; payload: GameMode }
  | { type: "SET_DIFFICULTY"; payload: Difficulty }
  | { type: "SET_SCORING_MODE"; payload: ScoringMode }
  | { type: "SET_TOTAL_QUESTIONS"; payload: number }
  | { type: "TOGGLE_SOUND" }
  | { type: "TOGGLE_EASY_MODE" }
  | { type: "START_GAME"; payload: Question[] }
  | { type: "SELECT_TOKEN"; payload: string }      // tokenId
  | { type: "DESELECT_TOKEN"; payload: string }    // tokenId
  | { type: "CLEAR_INPUT" }
  | { type: "CHECK_ANSWER" }
  | { type: "SKIP_QUESTION" }
  | { type: "NEXT_QUESTION" }
  | { type: "REORDER_INPUT_TOKENS"; payload: string[] }  // 새 순서의 token id 배열
  | {
      type: "MOVE_TOKEN";
      payload: { tokenId: string; from: "pool" | "input"; to: "pool" | "input" };
    }
  | { type: "SET_DRAGGING"; payload: boolean }
  | { type: "TICK_TIMER" }
  | { type: "RESET_TIMER" }
  | { type: "RESET_GAME" }
  | { type: "RETURN_TO_SETUP" };
