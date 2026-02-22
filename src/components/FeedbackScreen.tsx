import { useGame } from "../context/GameContext";

export function FeedbackScreen() {
  const { state, dispatch } = useGame();
  const { lastResult, currentIndex, questions } = state;

  if (!lastResult) return null;

  const isCorrect = lastResult.score === 1;
  const isLast = currentIndex >= questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-md p-6 space-y-6">
        {/* 정답/오답 배너 */}
        <div
          className={`text-center py-4 rounded-lg ${
            lastResult.skipped
              ? "bg-gray-100 text-gray-600"
              : isCorrect
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          <p className="text-2xl font-bold">
            {lastResult.skipped ? "스킵" : isCorrect ? "정답!" : "오답"}
          </p>
          <p className="text-lg font-semibold mt-1">
            {lastResult.score.toFixed(2)}점
          </p>
        </div>

        {/* 정답 제목 */}
        <div>
          <p className="text-sm text-gray-500 mb-1">정답</p>
          <p className="text-lg font-medium text-gray-800">
            {lastResult.title}
          </p>
        </div>

        {/* 정답 토큰 비교 */}
        <div>
          <p className="text-sm text-gray-500 mb-2">내 답변</p>
          <div className="flex flex-wrap gap-1">
            {lastResult.correctAnswer.map((correctToken, i) => {
              const userToken = lastResult.userAnswer[i];
              const isEmpty = userToken === undefined;
              const isTokenCorrect = userToken === correctToken;

              return (
                <span
                  key={i}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    isEmpty
                      ? "bg-gray-200 text-gray-500"
                      : isTokenCorrect
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

        {/* 정답 토큰 */}
        {!isCorrect && (
          <div>
            <p className="text-sm text-gray-500 mb-2">정답 순서</p>
            <div className="flex flex-wrap gap-1">
              {lastResult.correctAnswer.map((token, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {token}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 다음 문제 / 결과 보기 버튼 */}
        <button
          onClick={() => dispatch({ type: "NEXT_QUESTION" })}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          {isLast ? "결과 보기" : "다음 문제"}
        </button>
      </div>
    </div>
  );
}
