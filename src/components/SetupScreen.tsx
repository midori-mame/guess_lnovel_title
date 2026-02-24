import { useState } from "react";
import { useGame } from "../context/GameContext";
import type { Question } from "../types";
import questionsData from "../data/questions.json";
import { shuffle } from "../utils/shuffle";
import { FeaturedWrongAnswerShowcase } from "./FeaturedWrongAnswerShowcase";
import { InfoTab } from "./InfoTab";

type Tab = "settings" | "showcase" | "info";

export function SetupScreen() {
  const { state, dispatch } = useGame();
  const [activeTab, setActiveTab] = useState<Tab>("settings");
  // showcase는 처음 열릴 때만 마운트 (이후 탭 전환 시 재조회 방지)
  const [showcaseMounted, setShowcaseMounted] = useState(false);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "showcase") setShowcaseMounted(true);
  };

  const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20];

  const handleStart = () => {
    const allQuestions = questionsData as Question[];
    const selectedQuestions = shuffle(allQuestions).slice(0, state.totalQuestions);
    dispatch({ type: "START_GAME", payload: selectedQuestions });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center">
        제목이 너무 길어!
      </h1>

      {/* 탭 */}
      <div className="flex gap-1 mb-6 bg-gray-200 p-1 rounded-lg">
        <button
          onClick={() => handleTabChange("settings")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "settings"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          게임 설정
        </button>
        <button
          onClick={() => handleTabChange("showcase")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "showcase"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          틀려도 괜찮아
        </button>
        <button
          onClick={() => handleTabChange("info")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "info"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          정보
        </button>
      </div>

      {/* 게임 설정 탭 */}
      <div className={`w-full max-w-md space-y-6 ${activeTab !== "settings" ? "hidden" : ""}`}>
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

        {/* 문제 수 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            문제 수
          </label>
          <div className="flex gap-2">
            {QUESTION_COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                onClick={() => dispatch({ type: "SET_TOTAL_QUESTIONS", payload: count })}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  state.totalQuestions === count
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                {count}문제
              </button>
            ))}
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

      {/* 틀려도 괜찮아 탭 */}
      {showcaseMounted && (
        <div className={activeTab !== "showcase" ? "hidden" : ""}>
          <FeaturedWrongAnswerShowcase />
        </div>
      )}

      {/* 정보 탭 */}
      {activeTab === "info" && <InfoTab />}
    </div>
  );
}
