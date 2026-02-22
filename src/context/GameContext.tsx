import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from "react";
import type { GameState, GameAction, Question, Difficulty } from "../types";
import { shuffle } from "../utils/shuffle";
import { createTokens } from "../utils/tokenize";
import { scoreExact, scorePartial, calcTotalScore } from "../utils/score";

const TIME_LIMIT = 30;

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
  lastResult: null,
  totalScore: 0,
  timeLeft: TIME_LIMIT,
};

function loadQuestion(
  questions: Question[],
  index: number,
  difficulty: Difficulty,
  easyModeEnabled: boolean
): { inputTokens: GameState["inputTokens"]; poolTokens: GameState["poolTokens"] } {
  const question = questions[index];
  const rawTokens = question.tokens[difficulty];
  const tokens = createTokens(rawTokens);
  const shuffled = shuffle(tokens);

  if (easyModeEnabled && shuffled.length > 0) {
    // 간단 모드: 첫 번째 토큰을 정답 기준으로 inputTokens에 배치
    const firstCorrectToken = tokens[0];
    const firstTokenInPool = shuffled.find((t) => t.id === firstCorrectToken.id);
    if (firstTokenInPool) {
      return {
        inputTokens: [{ ...firstTokenInPool, isPlaced: true }],
        poolTokens: shuffled.filter((t) => t.id !== firstCorrectToken.id),
      };
    }
  }

  return {
    inputTokens: [],
    poolTokens: shuffled,
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_MODE":
      return { ...state, mode: action.payload };

    case "SET_DIFFICULTY":
      return { ...state, difficulty: action.payload };

    case "SET_SCORING_MODE":
      return { ...state, scoringMode: action.payload };

    case "TOGGLE_SOUND":
      return { ...state, soundEnabled: !state.soundEnabled };

    case "TOGGLE_EASY_MODE": {
      const newEasyMode = !state.easyModeEnabled;
      if (state.phase === "playing") {
        const { inputTokens, poolTokens } = loadQuestion(
          state.questions,
          state.currentIndex,
          state.difficulty,
          newEasyMode
        );
        return {
          ...state,
          easyModeEnabled: newEasyMode,
          inputTokens,
          poolTokens,
        };
      }
      return { ...state, easyModeEnabled: newEasyMode };
    }

    case "START_GAME": {
      const questions = action.payload;
      const { inputTokens, poolTokens } = loadQuestion(
        questions,
        0,
        state.difficulty,
        state.easyModeEnabled
      );
      return {
        ...state,
        phase: "playing",
        questions,
        currentIndex: 0,
        inputTokens,
        poolTokens,
        results: [],
        totalScore: 0,
        timeLeft: TIME_LIMIT,
      };
    }

    case "SELECT_TOKEN": {
      const tokenId = action.payload;
      const token = state.poolTokens.find((t) => t.id === tokenId);
      if (!token) return state;
      return {
        ...state,
        poolTokens: state.poolTokens.filter((t) => t.id !== tokenId),
        inputTokens: [...state.inputTokens, { ...token, isPlaced: true }],
      };
    }

    case "DESELECT_TOKEN": {
      const tokenId = action.payload;
      const token = state.inputTokens.find((t) => t.id === tokenId);
      if (!token) return state;
      return {
        ...state,
        inputTokens: state.inputTokens.filter((t) => t.id !== tokenId),
        poolTokens: [...state.poolTokens, { ...token, isPlaced: false }],
      };
    }

    case "CLEAR_INPUT": {
      return {
        ...state,
        poolTokens: [
          ...state.poolTokens,
          ...state.inputTokens.map((t) => ({ ...t, isPlaced: false })),
        ],
        inputTokens: [],
      };
    }

    case "CHECK_ANSWER": {
      const currentQuestion = state.questions[state.currentIndex];
      const correctAnswer = currentQuestion.tokens[state.difficulty];
      const score =
        state.scoringMode === "exact"
          ? scoreExact(state.inputTokens, correctAnswer)
          : scorePartial(state.inputTokens, correctAnswer);

      const result = {
        questionId: currentQuestion.id,
        title: currentQuestion.title,
        userAnswer: state.inputTokens.map((t) => t.text),
        correctAnswer,
        score,
        timeSpent: TIME_LIMIT - state.timeLeft,
        skipped: false,
      };

      return {
        ...state,
        phase: "feedback",
        results: [...state.results, result],
        lastResult: result,
      };
    }

    case "NEXT_QUESTION": {
      const newResults = state.results;
      const isLastQuestion = state.currentIndex >= state.questions.length - 1;

      if (isLastQuestion) {
        return {
          ...state,
          phase: "result",
          lastResult: null,
          totalScore: calcTotalScore(newResults),
        };
      }

      const nextIndex = state.currentIndex + 1;
      const { inputTokens, poolTokens } = loadQuestion(
        state.questions,
        nextIndex,
        state.difficulty,
        state.easyModeEnabled
      );

      return {
        ...state,
        phase: "playing",
        currentIndex: nextIndex,
        inputTokens,
        poolTokens,
        lastResult: null,
        timeLeft: TIME_LIMIT,
      };
    }

    case "SKIP_QUESTION": {
      const currentQuestion = state.questions[state.currentIndex];
      const correctAnswer = currentQuestion.tokens[state.difficulty];

      const result = {
        questionId: currentQuestion.id,
        title: currentQuestion.title,
        userAnswer: state.inputTokens.map((t) => t.text),
        correctAnswer,
        score: 0,
        timeSpent: TIME_LIMIT - state.timeLeft,
        skipped: true,
      };

      return {
        ...state,
        phase: "feedback",
        results: [...state.results, result],
        lastResult: result,
      };
    }

    case "REORDER_INPUT_TOKENS": {
      const orderedIds = action.payload;
      const reordered = orderedIds
        .map((id) => state.inputTokens.find((t) => t.id === id))
        .filter((t): t is GameState["inputTokens"][number] => t !== undefined);
      return { ...state, inputTokens: reordered };
    }

    case "TICK_TIMER":
      return { ...state, timeLeft: Math.max(0, state.timeLeft - 1) };

    case "RESET_TIMER":
      return { ...state, timeLeft: TIME_LIMIT };

    case "RESET_GAME":
      return initialState;

    default:
      return state;
  }
}

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
