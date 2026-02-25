import { useState } from "react";
import { useGame } from "../context/GameContext";
import { touchDragState } from "../utils/touchDragState";
import type { Token } from "../types";

function PlacedToken({
  token,
  isDraggingThis,
  isDragOverThis,
  onClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onTouchStart,
}: {
  token: Token;
  isDraggingThis: boolean;
  isDragOverThis: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onTouchStart: (e: React.TouchEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      data-token-id={token.id}
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onTouchStart={onTouchStart}
      className={`${token.color} px-3 py-2 rounded-lg font-medium text-gray-800 shadow-sm hover:opacity-80 active:opacity-60 transition-opacity ${
        isDraggingThis ? "opacity-40" : "opacity-100"
      } ${isDragOverThis ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
    >
      {token.text}
    </button>
  );
}

export function InputArea() {
  const { state, dispatch } = useGame();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isContainerDragOver, setIsContainerDragOver] = useState(false);

  // HTML5 DnD (PC)
  const handleDragStart = (e: React.DragEvent, token: Token) => {
    e.dataTransfer.setData("tokenId", token.id);
    e.dataTransfer.setData("from", "input");
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(token.id);
    dispatch({ type: "SET_DRAGGING", payload: true });
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
    dispatch({ type: "SET_DRAGGING", payload: false });
  };

  const handleTokenDragOver = (e: React.DragEvent, tokenId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setIsContainerDragOver(false);
    setDragOverId(tokenId);
  };

  const handleTokenDragLeave = () => {
    setDragOverId(null);
  };

  const handleTokenDrop = (e: React.DragEvent, dropOnTokenId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    setIsContainerDragOver(false);

    const tokenId = e.dataTransfer.getData("tokenId");
    const from = e.dataTransfer.getData("from") as "pool" | "input";

    if (from === "pool") {
      dispatch({ type: "MOVE_TOKEN", payload: { tokenId, from, to: "input" } });
    } else if (from === "input" && dropOnTokenId !== tokenId) {
      const currentIds = state.inputTokens.map((t) => t.id);
      const fromIndex = currentIds.indexOf(tokenId);
      const toIndex = currentIds.indexOf(dropOnTokenId);
      if (fromIndex !== -1 && toIndex !== -1) {
        const newIds = [...currentIds];
        newIds.splice(fromIndex, 1);
        newIds.splice(toIndex, 0, tokenId);
        dispatch({ type: "REORDER_INPUT_TOKENS", payload: newIds });
      }
    }
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsContainerDragOver(true);
    setDragOverId(null);
  };

  const handleContainerDragLeave = () => {
    setIsContainerDragOver(false);
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsContainerDragOver(false);
    setDragOverId(null);

    const tokenId = e.dataTransfer.getData("tokenId");
    const from = e.dataTransfer.getData("from") as "pool" | "input";
    if (from === "input") return;
    dispatch({ type: "MOVE_TOKEN", payload: { tokenId, from, to: "input" } });
  };

  // 터치 DnD (모바일) — touchmove/touchend는 useGlobalTouchDrag에서 처리
  const handleTouchStart = (
    e: React.TouchEvent<HTMLButtonElement>,
    token: Token
  ) => {
    touchDragState.current = {
      tokenId: token.id,
      from: "input",
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      isDragging: false,
      ghostEl: null,
      sourceEl: e.currentTarget,
    };
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div
        data-dropzone="input"
        className={`border-2 border-dashed rounded-lg p-4 min-h-[80px] transition-colors ${
          isContainerDragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-gray-50"
        }`}
        onDragOver={handleContainerDragOver}
        onDragLeave={handleContainerDragLeave}
        onDrop={handleContainerDrop}
      >
        {state.inputTokens.length === 0 ? (
          <p className="text-gray-400 text-center">토큰을 선택하세요</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {state.inputTokens.map((token) => (
              <PlacedToken
                key={token.id}
                token={token}
                isDraggingThis={draggingId === token.id}
                isDragOverThis={dragOverId === token.id}
                onClick={() =>
                  dispatch({ type: "DESELECT_TOKEN", payload: token.id })
                }
                onDragStart={(e) => handleDragStart(e, token)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleTokenDragOver(e, token.id)}
                onDragLeave={handleTokenDragLeave}
                onDrop={(e) => handleTokenDrop(e, token.id)}
                onTouchStart={(e) => handleTouchStart(e, token)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
