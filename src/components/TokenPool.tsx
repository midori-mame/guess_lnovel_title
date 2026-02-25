import { useState } from "react";
import { useGame } from "../context/GameContext";
import type { Token } from "../types";

function TokenButton({
  token,
  draggingId,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  token: Token;
  draggingId: string | null;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <button
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`${token.color} px-3 py-2 rounded-lg font-medium text-gray-800 shadow-sm hover:opacity-80 active:opacity-60 transition-opacity ${
        draggingId === token.id ? "opacity-40" : "opacity-100"
      }`}
    >
      {token.text}
    </button>
  );
}

export function TokenPool() {
  const { state, dispatch } = useGame();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const currentQuestion = state.questions[state.currentIndex];
  const totalTokenCount = currentQuestion?.tokens[state.difficulty].length ?? 0;

  const handleDragStart = (e: React.DragEvent, token: Token) => {
    e.dataTransfer.setData("tokenId", token.id);
    e.dataTransfer.setData("from", "pool");
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(token.id);
    dispatch({ type: "SET_DRAGGING", payload: true });
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    dispatch({ type: "SET_DRAGGING", payload: false });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const tokenId = e.dataTransfer.getData("tokenId");
    const from = e.dataTransfer.getData("from") as "pool" | "input";
    if (from === "pool") return;
    dispatch({ type: "MOVE_TOKEN", payload: { tokenId, from, to: "pool" } });
  };

  return (
    <div
      className={`w-full max-w-4xl mx-auto p-4 rounded-lg transition-colors ${
        isDragOver ? "bg-blue-50" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {state.easyModeEnabled && (
        <p className="text-sm text-gray-500 mb-2 text-center">
          총 {totalTokenCount}개의 토큰을 배열하세요
        </p>
      )}
      <div className="flex flex-wrap gap-2 justify-center">
        {state.poolTokens.map((token) => (
          <TokenButton
            key={token.id}
            token={token}
            draggingId={draggingId}
            onClick={() => dispatch({ type: "SELECT_TOKEN", payload: token.id })}
            onDragStart={(e) => handleDragStart(e, token)}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>
    </div>
  );
}
