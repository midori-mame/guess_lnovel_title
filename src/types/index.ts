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
  currentIndex: number;          // 현재 문제 인덱스 (0~9)
  inputTokens: Token[];          // 입력 영역에 배치된 토큰
  poolTokens: Token[];           // 아직 선택되지 않은 토큰
  results: QuestionResult[];
  lastResult: QuestionResult | null;  // 직전 문제 채점 결과 (feedback 페이즈용)
  totalScore: number;
  timeLeft: number;              // 타임어택 모드 남은 시간(초)
}

// 게임 액션 타입
export type GameAction =
  | { type: "SET_MODE"; payload: GameMode }
  | { type: "SET_DIFFICULTY"; payload: Difficulty }
  | { type: "SET_SCORING_MODE"; payload: ScoringMode }
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
  | { type: "TICK_TIMER" }
  | { type: "RESET_TIMER" }
  | { type: "RESET_GAME" };
