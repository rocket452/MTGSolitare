import { AlertTriangle, Layers } from "lucide-react";
import type { MissingLookup, PlayerId } from "../types";

type TurnBarProps = {
  activePlayer: PlayerId;
  nextPlayer: PlayerId;
  isPassAndPlay: boolean;
  missingCards: MissingLookup[];
  onDraw: () => void;
  onFlipTurn: () => void;
};

export function TurnBar({ activePlayer, nextPlayer, isPassAndPlay, missingCards, onDraw, onFlipTurn }: TurnBarProps) {
  return (
    <footer className="turn-bar" aria-label="Turn controls">
      <button type="button" className="turn-button draw-turn-button" onClick={onDraw}>
        <Layers size={19} />
        Draw Player {activePlayer}
      </button>
      <button type="button" className="turn-button" onClick={onFlipTurn}>
        {isPassAndPlay ? "End Turn" : `Flip to Player ${nextPlayer}`}
      </button>
      {missingCards.length > 0 && (
        <details className="missing-lookups">
          <summary>
            <AlertTriangle size={16} />
            Missing {missingCards.length}
          </summary>
          <ul>
            {missingCards.map((missing) => (
              <li key={missing.typedName}>{missing.typedName}</li>
            ))}
          </ul>
        </details>
      )}
    </footer>
  );
}
