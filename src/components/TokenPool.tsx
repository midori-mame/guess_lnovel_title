import { useDraggable } from "@dnd-kit/core";
import { useGame } from "../context/GameContext";
import type { Token } from "../types";

function DraggableToken({
  token,
  onClick,
}: {
  token: Token;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: token.id,
    data: { source: "pool" },
  });

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`${token.color} px-3 py-2 rounded-lg font-medium text-gray-800 shadow-sm hover:opacity-80 transition-opacity ${
        isDragging ? "opacity-30 cursor-grabbing" : "cursor-grab"
      }`}
    >
      {token.text}
    </button>
  );
}

export function TokenPool() {
  const { state, dispatch } = useGame();

  const currentQuestion = state.questions[state.currentIndex];
  const totalTokenCount = currentQuestion?.tokens[state.difficulty].length ?? 0;

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {state.easyModeEnabled && (
        <p className="text-sm text-gray-500 mb-2 text-center">
          총 {totalTokenCount}개의 토큰을 배열하세요
        </p>
      )}
      <div className="flex flex-wrap gap-2 justify-center">
        {state.poolTokens.map((token) => (
          <DraggableToken
            key={token.id}
            token={token}
            onClick={() => dispatch({ type: "SELECT_TOKEN", payload: token.id })}
          />
        ))}
      </div>
    </div>
  );
}
