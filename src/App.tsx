import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useGame } from "./context/GameContext";
import { SetupScreen } from "./components/SetupScreen";
import { GameHeader } from "./components/GameHeader";
import { InputArea } from "./components/InputArea";
import { TokenPool } from "./components/TokenPool";
import { ActionButtons } from "./components/ActionButtons";
import { ResultScreen } from "./components/ResultScreen";
import { FeedbackScreen } from "./components/FeedbackScreen";

function GameScreen() {
  const { state, dispatch } = useGame();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeSource = active.data.current?.source as "pool" | "input" | undefined;
    const overSource = over.data.current?.source as "pool" | "input" | undefined;

    if (activeSource === "pool") {
      // 풀 → 입력 영역으로 드래그
      if (overSource === "input") {
        dispatch({ type: "SELECT_TOKEN", payload: String(active.id) });
      }
    } else if (activeSource === "input") {
      // 입력 영역 내 순서 변경
      if (overSource === "input" && active.id !== over.id) {
        const oldIndex = state.inputTokens.findIndex((t) => t.id === active.id);
        const newIndex = state.inputTokens.findIndex((t) => t.id === over.id);
        const newOrder = arrayMove(state.inputTokens, oldIndex, newIndex).map(
          (t) => t.id
        );
        dispatch({ type: "REORDER_INPUT_TOKENS", payload: newOrder });
      }
    }
  };

  const activeToken =
    state.poolTokens.find((t) => t.id === activeId) ??
    state.inputTokens.find((t) => t.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-100">
        <GameHeader />
        <main className="py-6">
          <InputArea />
          <TokenPool />
          <ActionButtons />
        </main>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeToken ? (
          <div
            className={`${activeToken.color} px-3 py-2 rounded-lg font-medium text-gray-800 shadow-lg cursor-grabbing`}
          >
            {activeToken.text}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function App() {
  const { state } = useGame();

  switch (state.phase) {
    case "setup":
      return <SetupScreen />;
    case "playing":
      return <GameScreen />;
    case "feedback":
      return <FeedbackScreen />;
    case "result":
      return <ResultScreen />;
    default:
      return <SetupScreen />;
  }
}

export default App;
