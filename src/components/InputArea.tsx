import { useGame } from "../context/GameContext";
import type { Token } from "../types";

function PlacedToken({
  token,
  onClick,
}: {
  token: Token;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`${token.color} px-3 py-2 rounded-lg font-medium text-gray-800 shadow-sm hover:opacity-80 active:opacity-60 transition-opacity`}
    >
      {token.text}
    </button>
  );
}

export function InputArea() {
  const { state, dispatch } = useGame();

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="border-2 border-dashed rounded-lg p-4 min-h-[80px] border-gray-300 bg-gray-50">
        {state.inputTokens.length === 0 ? (
          <p className="text-gray-400 text-center">토큰을 선택하세요</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {state.inputTokens.map((token) => (
              <PlacedToken
                key={token.id}
                token={token}
                onClick={() =>
                  dispatch({ type: "DESELECT_TOKEN", payload: token.id })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
