import type { WrongAnswerEntry } from "../types";

const RANK_SYMBOLS = ["①", "②", "③", "④", "⑤"];

interface OtherWrongAnswersProps {
  questionId: number;
  entries: WrongAnswerEntry[];
  isLoading: boolean;
  onLike: (
    wrongAnswerId: string,
    questionId: number,
    prevLiked: boolean,
    prevCount: number
  ) => void;
}

export function OtherWrongAnswers({
  questionId,
  entries,
  isLoading,
  onLike,
}: OtherWrongAnswersProps) {
  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <p className="text-xs font-semibold text-gray-500 mb-2">
        다른 유저들은 이렇게 틀렸어요!
      </p>

      {isLoading ? (
        // 스켈레톤 UI
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : entries.filter((e) => !e.isMyAnswer).length === 0 ? (
        <p className="text-xs text-gray-400">아직 다른 유저의 오답이 없어요.</p>
      ) : (
        <div className="space-y-2">
          {entries.filter((e) => !e.isMyAnswer).map((entry, index) => (
            <div key={entry.id} className="flex items-start gap-2 w-full max-w-full overflow-hidden">
              {/* 순위 번호 */}
              <span className="text-xs text-gray-400 mt-1 w-4 shrink-0">
                {RANK_SYMBOLS[index]}
              </span>

              {/* 토큰 목록 */}
              <div className="flex-1 flex flex-wrap items-center gap-1 min-w-0">
                {entry.answerTokens.map((token, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    {token}
                  </span>
                ))}
              </div>

              {/* 좋아요 버튼 */}
              <button
                type="button"
                onClick={() =>
                  onLike(entry.id, questionId, entry.iLiked, entry.likesCount)
                }
                className={[
                  "flex items-center gap-0.5 text-xs px-2 py-1 rounded transition-colors shrink-0",
                  entry.iLiked
                    ? "text-red-500 bg-red-50 hover:bg-red-100"
                    : "text-gray-400 hover:text-red-500 hover:bg-red-50",
                ].join(" ")}
              >
                <span>👍</span>
                <span>{entry.likesCount}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
