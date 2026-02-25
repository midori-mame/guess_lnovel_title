import { useGame } from "./context/GameContext";
import { SetupScreen } from "./components/SetupScreen";
import { GameHeader } from "./components/GameHeader";
import { InputArea } from "./components/InputArea";
import { TokenPool } from "./components/TokenPool";
import { ActionButtons } from "./components/ActionButtons";
import { ResultScreen } from "./components/ResultScreen";
import { FeedbackScreen } from "./components/FeedbackScreen";
import { useWrongAnswerSaver } from "./hooks/useWrongAnswerSaver";

function GameScreen() {
  const { state } = useGame();
  return (
    <div
      className="min-h-screen bg-gray-100"
      style={{ touchAction: state.isDragging ? "none" : "auto" }}
    >
      <GameHeader />
      <main className="py-6">
        <InputArea />
        <TokenPool />
        <ActionButtons />
      </main>
    </div>
  );
}

function App() {
  const { state } = useGame();
  // 오답 발생 시 서버에 저장 (fire-and-forget)
  useWrongAnswerSaver();

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
