import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useGame } from "../context/GameContext";
import type { Token } from "../types";

function SortableToken({
  token,
  onClick,
}: {
  token: Token;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: token.id, data: { source: "input" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
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

export function InputArea() {
  const { state, dispatch } = useGame();

  const { setNodeRef, isOver } = useDroppable({
    id: "input-droppable",
    data: { source: "input" },
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div
        ref={setNodeRef}
        className={`border-2 border-dashed rounded-lg p-4 min-h-[80px] transition-colors ${
          isOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-gray-50"
        }`}
      >
        {state.inputTokens.length === 0 ? (
          <p className="text-gray-400 text-center">토큰을 선택하세요</p>
        ) : (
          <SortableContext
            items={state.inputTokens.map((t) => t.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex flex-wrap gap-2">
              {state.inputTokens.map((token) => (
                <SortableToken
                  key={token.id}
                  token={token}
                  onClick={() =>
                    dispatch({ type: "DESELECT_TOKEN", payload: token.id })
                  }
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
