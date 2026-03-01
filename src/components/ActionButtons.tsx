import { useGame } from "../context/GameContext";

export function ActionButtons() {
  const { dispatch } = useGame();

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => dispatch({ type: "CLEAR_INPUT" })}
          className="px-6 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
        >
          초기화
        </button>
        <button
          onClick={() => dispatch({ type: "CHECK_ANSWER" })}
          className="px-6 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
        >
          정답 확인
        </button>
        <button
          onClick={() => dispatch({ type: "SKIP_QUESTION" })}
          className="px-6 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          스킵
        </button>
      </div>
    </div>
  );
}
