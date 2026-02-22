import { useGame } from "../context/GameContext";
import { getGrade } from "../utils/score";

export function ResultScreen() {
  const { state, dispatch } = useGame();
  const { grade, message } = getGrade(state.totalScore);
  const percentage = Math.round((state.totalScore / state.questions.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 총점 및 등급 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">게임 결과</h1>
          <div className="text-6xl font-bold text-blue-600 mb-2">{grade}</div>
          <p className="text-lg text-gray-600 mb-4">{message}</p>
          <div className="text-xl font-medium text-gray-700">
            총점: {state.totalScore.toFixed(2)} / {state.questions.length}.00
          </div>
          <div className="text-lg text-gray-500">정답률: {percentage}%</div>
        </div>

        {/* 문제별 복기 */}
        <div className="space-y-4 mb-6">
          {state.results.map((result, index) => (
            <div key={result.questionId} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-700">
                  문제 {index + 1}
                </span>
                <span
                  className={`font-bold ${
                    result.score === 1 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {result.score.toFixed(2)}점
                  {result.skipped && " (스킵)"}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-2">정답: {result.title}</p>

              {/* 플레이어 답변 */}
              <div className="flex flex-wrap gap-1 mb-2">
                {result.correctAnswer.map((correctToken, i) => {
                  const userToken = result.userAnswer[i];
                  const isCorrect = userToken === correctToken;
                  const isEmpty = userToken === undefined;

                  return (
                    <span
                      key={i}
                      className={`px-2 py-1 rounded text-sm ${
                        isEmpty
                          ? "bg-gray-200 text-gray-500"
                          : isCorrect
                          ? "bg-green-200 text-green-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {isEmpty ? correctToken : userToken}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 다시 시작 버튼 */}
        <button
          onClick={() => dispatch({ type: "RESET_GAME" })}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          다시 시작
        </button>
      </div>
    </div>
  );
}
