import { useEffect, useState, useCallback } from "react";
import { getUserUuid } from "../utils/userUuid";
import type { FeaturedWrongAnswerEntry, FeaturedWrongAnswers } from "../types";

// ─── 개별 오답 카드 ────────────────────────────────────────────

interface EntryCardProps {
  entry: FeaturedWrongAnswerEntry;
  onLike: (id: string, prevLiked: boolean, prevCount: number) => void;
}

function EntryCard({ entry, onLike }: EntryCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <p className="text-xs text-gray-400 mb-1.5 truncate">{entry.title}</p>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1 flex-1">
          {entry.answerTokens.map((token, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
            >
              {token}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onLike(entry.id, entry.iLiked, entry.likesCount)}
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
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
      <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
      <div className="h-6 bg-gray-100 rounded animate-pulse" />
    </div>
  );
}

// ─── 섹션 ──────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  subtitle?: string;
  entries: FeaturedWrongAnswerEntry[];
  isLoading: boolean;
  emptyMessage: string;
  onLike: (id: string, prevLiked: boolean, prevCount: number) => void;
}

function Section({
  title,
  subtitle,
  entries,
  isLoading,
  emptyMessage,
  onLike,
}: SectionProps) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-700 mb-3">
        {title}
        {subtitle && (
          <span className="ml-1.5 text-xs font-normal text-gray-400">
            {subtitle}
          </span>
        )}
      </h2>
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-400">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onLike={onLike}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────

export function FeaturedWrongAnswerShowcase() {
  const [popular, setPopular] = useState<FeaturedWrongAnswerEntry[]>([]);
  const [random, setRandom] = useState<FeaturedWrongAnswerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const userUuid = getUserUuid();
    setIsLoading(true);
    fetch(
      `/api/featured-wrong-answers?userUuid=${encodeURIComponent(userUuid)}`
    )
      .then((res) => res.json())
      .then((data: FeaturedWrongAnswers) => {
        // 자기 오답 제외, 최대 3개
        setPopular(data.popular.filter((e) => !e.isMyAnswer).slice(0, 3));
        setRandom(data.random.filter((e) => !e.isMyAnswer).slice(0, 3));
      })
      .catch((err) => console.error("[featured] 조회 실패:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const makeLikeHandler = useCallback(
    (setter: React.Dispatch<React.SetStateAction<FeaturedWrongAnswerEntry[]>>) =>
      async (id: string, prevLiked: boolean, prevCount: number) => {
        const userUuid = getUserUuid();

        const update = (liked: boolean, count: number) =>
          setter((prev) =>
            prev.map((e) =>
              e.id === id ? { ...e, iLiked: liked, likesCount: count } : e
            )
          );

        // 낙관적 업데이트
        update(!prevLiked, prevLiked ? prevCount - 1 : prevCount + 1);

        try {
          const res = await fetch("/api/likes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wrongAnswerId: id, userUuid }),
          });
          const data = await res.json();

          if (res.ok) {
            update(data.action === "liked", data.likesCount);
          } else {
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

  const handlePopularLike = useCallback(
    makeLikeHandler(setPopular),
    [makeLikeHandler]
  );
  const handleRandomLike = useCallback(
    makeLikeHandler(setRandom),
    [makeLikeHandler]
  );

  return (
    <div className="w-full max-w-md space-y-6">
      <Section
        title="🏆 인기 있는 오답"
        subtitle="(좋아요 5개 이상 중 무작위)"
        entries={popular}
        isLoading={isLoading}
        emptyMessage="아직 인기 있는 오답이 없어요."
        onLike={handlePopularLike}
      />
      <Section
        title="🎲 랜덤 오답"
        entries={random}
        isLoading={isLoading}
        emptyMessage="아직 오답이 없어요."
        onLike={handleRandomLike}
      />
    </div>
  );
}
