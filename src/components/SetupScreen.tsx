import { useGame } from "../context/GameContext";
import type { Question } from "../types";
import questionsData from "../data/questions.json";
import { shuffle } from "../utils/shuffle";

export function SetupScreen() {
  const { state, dispatch } = useGame();

  const handleStart = () => {
    const allQuestions = questionsData as Question[];
    const selectedQuestions = shuffle(allQuestions).slice(0, 10);
    dispatch({ type: "START_GAME", payload: selectedQuestions });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8 text-center">
        한국 웹소설 제목 정렬 게임
      </h1>

      <div className="w-full max-w-md space-y-6">
        {/* 게임 모드 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            게임 모드
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => dispatch({ type: "SET_MODE", payload: "normal" })}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                state.mode === "normal"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              통상 모드
            </button>
            <button
              onClick={() => dispatch({ type: "SET_MODE", payload: "timeattack" })}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                state.mode === "timeattack"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              타임어택
            </button>
          </div>
        </div>

        {/* 난이도 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            난이도
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => dispatch({ type: "SET_DIFFICULTY", payload: "easy" })}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                state.difficulty === "easy"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              쉬움
            </button>
            <button
              onClick={() => dispatch({ type: "SET_DIFFICULTY", payload: "hard" })}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                state.difficulty === "hard"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              어려움
            </button>
          </div>
        </div>

        {/* 채점 방식 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            채점 방식
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => dispatch({ type: "SET_SCORING_MODE", payload: "exact" })}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                state.scoringMode === "exact"
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              완답만
            </button>
            <button
              onClick={() => dispatch({ type: "SET_SCORING_MODE", payload: "partial" })}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                state.scoringMode === "partial"
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              부분 점수
            </button>
          </div>
        </div>

        {/* 시작 버튼 */}
        <button
          onClick={handleStart}
          className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          게임 시작
        </button>
      </div>
    </div>
  );
}
