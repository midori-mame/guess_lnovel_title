import { useState } from "react";
import { useGame } from "../context/GameContext";
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
}) {
  return (
    <button
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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

  // 특정 토큰 위에서 드래그 중
  const handleTokenDragOver = (e: React.DragEvent, tokenId: string) => {
    e.preventDefault();
    e.stopPropagation(); // 컨테이너 onDragOver 억제
    e.dataTransfer.dropEffect = "move";
    setIsContainerDragOver(false);
    setDragOverId(tokenId);
  };

  const handleTokenDragLeave = () => {
    setDragOverId(null);
  };

  // 특정 토큰 위에 드롭
  const handleTokenDrop = (e: React.DragEvent, dropOnTokenId: string) => {
    e.preventDefault();
    e.stopPropagation(); // 컨테이너 onDrop 억제
    setDragOverId(null);
    setIsContainerDragOver(false);

    const tokenId = e.dataTransfer.getData("tokenId");
    const from = e.dataTransfer.getData("from") as "pool" | "input";

    if (from === "pool") {
      // 풀 → 입력 영역 (드롭된 토큰 끝에 추가)
      dispatch({ type: "MOVE_TOKEN", payload: { tokenId, from, to: "input" } });
    } else if (from === "input" && dropOnTokenId !== tokenId) {
      // 입력 영역 내 순서 변경
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

  // 컨테이너 빈 공간에서 드래그 중
  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsContainerDragOver(true);
    setDragOverId(null);
  };

  const handleContainerDragLeave = () => {
    setIsContainerDragOver(false);
  };

  // 컨테이너 빈 공간에 드롭 (토큰 위가 아닌 곳)
  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsContainerDragOver(false);
    setDragOverId(null);

    const tokenId = e.dataTransfer.getData("tokenId");
    const from = e.dataTransfer.getData("from") as "pool" | "input";
    if (from === "input") return; // 입력 영역 내 드롭은 토큰 레벨에서 처리
    dispatch({ type: "MOVE_TOKEN", payload: { tokenId, from, to: "input" } });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
