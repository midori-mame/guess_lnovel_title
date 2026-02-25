import { useEffect, useState, useCallback } from "react";
import { useGame } from "../context/GameContext";
import { getGrade } from "../utils/score";
import { getUserUuid } from "../utils/userUuid";
import { OtherWrongAnswers } from "./OtherWrongAnswers";
import type { OtherWrongAnswers as OtherWrongAnswersType, WrongAnswerEntry } from "../types";

export function ResultScreen() {
  const { state, dispatch } = useGame();
  const { grade, message } = getGrade(state.totalScore, state.totalQuestions);
  const percentage = Math.round((state.totalScore / state.totalQuestions) * 100);

  const [otherAnswers, setOtherAnswers] = useState<OtherWrongAnswersType>({});
  const [isLoading, setIsLoading] = useState(false);

  // 결과 화면 진입 시 오답 문제들의 타 유저 오답 조회
  useEffect(() => {
    const wrongResults = state.results.filter((r) => r.score < 1.0);
    // 전부 정답이면 API 호출 불필요
    if (wrongResults.length === 0) return;

    const questionIds = wrongResults.map((r) => r.questionId).join(",");
    const userUuid = getUserUuid();
    const params = new URLSearchParams({
      questionIds,
      userUuid,
      difficulty: state.difficulty,
    });

    setIsLoading(true);
    fetch(`/api/wrong-answers?${params.toString()}`)
      .then((res) => res.json())
      .then((data: OtherWrongAnswersType) => setOtherAnswers(data))
      .catch((err) => console.error("[result] 오답 조회 실패:", err))
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 좋아요 토글 (낙관적 업데이트)
  const handleLike = useCallback(
    async (
      wrongAnswerId: string,
      questionId: number,
      prevLiked: boolean,
      prevCount: number
    ) => {
      const userUuid = getUserUuid();

      // 즉시 UI 반영
      const update = (liked: boolean, count: number) =>
        setOtherAnswers((prev) => ({
          ...prev,
          [questionId]: (prev[questionId] ?? []).map((entry: WrongAnswerEntry) =>
            entry.id === wrongAnswerId
              ? { ...entry, iLiked: liked, likesCount: count }
              : entry
          ),
        }));

      update(!prevLiked, prevLiked ? prevCount - 1 : prevCount + 1);

      try {
        const res = await fetch("/api/likes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wrongAnswerId, userUuid }),
        });
        const data = await res.json();

        if (res.ok) {
          // 서버 실제값으로 최종 반영
          update(data.action === "liked", data.likesCount);
        } else {
          // 실패 시 롤백
          update(prevLiked, prevCount);
          console.error("[likes] 서버 오류:", data.error);
        }
      } catch (err) {
        update(prevLiked, prevCount);
        console.error("[likes] 네트워크 오류:", err);
      }
    },
    []
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 총점 및 등급 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">게임 결과</h1>
          <div className="text-6xl font-bold text-blue-600 mb-2">{grade}</div>
          <p className="text-lg text-gray-600 mb-4">{message}</p>
          <div className="text-xl font-medium text-gray-700">
            총점: {state.totalScore.toFixed(2)} / {state.totalQuestions}.00
          </div>
          <div className="text-lg text-gray-500">정답률: {percentage}%</div>
        </div>

        {/* 문제별 복기 */}
        <div className="space-y-4 mb-6">
          {state.results.map((result, index) => {
            const isWrong = result.score < 1.0;
            const wrongEntries: WrongAnswerEntry[] = otherAnswers[result.questionId] ?? [];

            return (
              <div key={result.questionId} className="bg-white rounded-lg shadow-sm p-4">
                {/* 문제 헤더 */}
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">문제 {index + 1}</span>
                  <span
                    className={`font-bold ${
                      result.score === 1 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {result.score.toFixed(2)}점
                    {result.skipped && " (스킵)"}
                  </span>
                </div>

                <p className="text-sm text-gray-500 mb-2">
                  정답:{" "}
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(result.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600 transition-colors"
                  >
                    {result.title} ↗
                  </a>
                </p>

                {/* 내 답변 토큰 */}
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

                {/* 다른 유저 오답 (틀린 문제에만 표시) */}
                {isWrong && (
                  <OtherWrongAnswers
                    questionId={result.questionId}
                    entries={wrongEntries}
                    isLoading={isLoading}
                    onLike={handleLike}
                  />
                )}
              </div>
            );
          })}
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
