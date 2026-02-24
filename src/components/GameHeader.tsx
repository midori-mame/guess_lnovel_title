import { useState } from "react";
import { useGame } from "../context/GameContext";
import { ConfirmDialog } from "./ConfirmDialog";

export function GameHeader() {
  const { state, dispatch } = useGame();
  const [showConfirm, setShowConfirm] = useState(false);

  const difficultyLabel = state.difficulty === "easy" ? "쉬움" : "어려움";
  const scoringLabel = state.scoringMode === "exact" ? "완답만" : "부분 점수";
  const modeLabel = state.mode === "normal" ? "통상" : "타임어택";

  const currentScore = state.results.reduce((acc, r) => acc + r.score, 0);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 p-4">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* 좌측: 처음으로 버튼 + 설정 뱃지 및 진행 상황 */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowConfirm(true)}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors mr-1"
          >
            ← 처음으로
          </button>
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
            {difficultyLabel}
          </span>
          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
            {scoringLabel}
          </span>
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
            {modeLabel}
          </span>
          <span className="text-sm text-gray-600 ml-2">
            문제: {state.currentIndex + 1}/{state.totalQuestions}
          </span>
        </div>

        <ConfirmDialog
          isOpen={showConfirm}
          message={"게임을 종료하고 처음으로 돌아가시겠어요?\n현재 진행 상황은 저장되지 않습니다."}
          confirmLabel="처음으로"
          onConfirm={() => {
            setShowConfirm(false);
            dispatch({ type: "RETURN_TO_SETUP" });
          }}
          onCancel={() => setShowConfirm(false)}
        />

        {/* 우측: 점수, 타이머, 토글 */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">
            현재 점수: {currentScore.toFixed(2)}
          </span>

          {/* 타임어택 모드 타이머 */}
          {state.mode === "timeattack" && (
            <span
              className={`text-sm font-bold px-2 py-1 rounded ${
                state.timeLeft <= 5
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {state.timeLeft}초
            </span>
          )}

          {/* 효과음 토글 */}
          <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={state.soundEnabled}
              onChange={() => dispatch({ type: "TOGGLE_SOUND" })}
              className="w-4 h-4 rounded"
            />
            효과음
          </label>

          {/* 간단 모드 토글 */}
          <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={state.easyModeEnabled}
              onChange={() => dispatch({ type: "TOGGLE_EASY_MODE" })}
              className="w-4 h-4 rounded"
            />
            힌트
          </label>
        </div>
      </div>
    </header>
  );
}
