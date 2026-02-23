import { useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { getUserUuid } from "../utils/userUuid";
import type { QuestionResult } from "../types";

// CHECK_ANSWER 이후 lastResult 변화를 감지하여 오답을 서버에 저장합니다.
// - 게임 진행을 블로킹하지 않습니다 (fire-and-forget).
// - 스킵(skipped: true) 이나 정답(score >= 1.0) 은 저장하지 않습니다.
// - API 실패 시 콘솔에만 오류를 출력합니다.
export function useWrongAnswerSaver() {
  const { state } = useGame();
  // 이전 lastResult 참조를 기억하여 동일 결과를 중복 저장하지 않도록 합니다.
  const prevResultRef = useRef<QuestionResult | null>(null);

  useEffect(() => {
    const result = state.lastResult;

    // lastResult 가 없거나, 이전과 동일한 객체면 무시
    if (!result || result === prevResultRef.current) return;
    prevResultRef.current = result;

    // 스킵 또는 정답이면 저장 불필요
    if (result.skipped || result.score >= 1.0) return;

    const userUuid = getUserUuid();

    // fire-and-forget
    fetch("/api/wrong-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: result.questionId,
        userUuid,
        answerTokens: result.userAnswer,
        correctTokens: result.correctAnswer,
        difficulty: state.difficulty,
      }),
    }).catch((err) => {
      console.error("[wrong-answers] 오답 저장 실패:", err);
    });
  }, [state.lastResult, state.difficulty]);
}
