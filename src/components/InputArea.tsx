import { useState } from "react";
import { useGame } from "../context/GameContext";
import type { Token } from "../types";

function PlacedToken({
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

export function InputArea() {
  const { state, dispatch } = useGame();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent, token: Token) => {
    e.dataTransfer.setData("tokenId", token.id);
    e.dataTransfer.setData("from", "input");
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
    if (from === "input") return;
    dispatch({ type: "MOVE_TOKEN", payload: { tokenId, from, to: "input" } });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div
        className={`border-2 border-dashed rounded-lg p-4 min-h-[80px] transition-colors ${
          isDragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-gray-50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {state.inputTokens.length === 0 ? (
          <p className="text-gray-400 text-center">토큰을 선택하세요</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {state.inputTokens.map((token) => (
              <PlacedToken
                key={token.id}
                token={token}
                draggingId={draggingId}
                onClick={() =>
                  dispatch({ type: "DESELECT_TOKEN", payload: token.id })
                }
                onDragStart={(e) => handleDragStart(e, token)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
