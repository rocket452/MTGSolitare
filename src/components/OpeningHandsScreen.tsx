import { Check, RotateCw } from "lucide-react";
import type { CardInstance, DragPoint, PlayerId, PlayerState, ZoneName } from "../types";
import { CardTray } from "./CardTray";

type OpeningHandsScreenProps = {
  players: PlayerState[];
  onInspectCard: (card: CardInstance) => void;
  onMulligan: (playerId: PlayerId) => void;
  onKeepOpeningHand: (playerId: PlayerId) => void;
};

export function OpeningHandsScreen({
  players,
  onInspectCard,
  onMulligan,
  onKeepOpeningHand,
}: OpeningHandsScreenProps) {
  const keptCount = players.filter((player) => player.openingHandKept).length;
  const activePlayer = players.find((player) => !player.openingHandKept) ?? players[0];
  const activeStep = Math.min(keptCount + 1, players.length);
  const keepLabel = activeStep === players.length ? "Keep and start" : "Keep and continue";

  return (
    <main className="opening-hands-screen">
      <header className="opening-hands-header">
        <div>
          <h1>Opening hands</h1>
          <p>
            {activePlayer.name} choosing - Step {activeStep}/{players.length}
          </p>
        </div>
      </header>

      <div className="opening-player-progress" aria-label="Opening hand progress">
        {players.map((player) => (
          <span
            key={player.id}
            className={[
              "opening-player-pill",
              `player-${player.id.toLowerCase()}`,
              player.id === activePlayer.id ? "is-active" : "",
              player.openingHandKept ? "is-kept" : "",
            ].join(" ")}
          >
            <strong>{player.id}</strong>
            {player.openingHandKept ? "Kept" : player.id === activePlayer.id ? "Choosing" : "Waiting"}
          </span>
        ))}
      </div>

      <section
        className={["opening-hand-card", "opening-active-hand", `player-${activePlayer.id.toLowerCase()}`, "is-active"].join(" ")}
        aria-label={`${activePlayer.name} opening hand`}
      >
        <header className="opening-hand-card-header">
          <div className="player-title">
            <span className="player-mark">{activePlayer.id}</span>
            <div>
              <h2>{activePlayer.name}</h2>
              <p>Choosing</p>
            </div>
          </div>
          <div className="opening-hand-stats" aria-label={`${activePlayer.name} opening hand status`}>
            <span>Mulls {activePlayer.mulligans}</span>
            <span>Lib {activePlayer.zones.library.length}</span>
          </div>
        </header>

        <CardTray
          playerId={activePlayer.id}
          title="Opening hand"
          zoneName="hand"
          cards={activePlayer.zones.hand}
          compact
          groupHandCards={false}
          emptyText="No cards in hand"
          onCardTap={(_, card) => onInspectCard(card)}
          onInspectCard={onInspectCard}
          onCardDragStart={noopDragStart}
          onCardDragMove={noopDragMove}
          onCardDragEnd={noopDragMove}
        />

        <footer className="opening-hand-footer">
          {activePlayer.mulligans > 0 && <p className="opening-bottom-note">Bottom {activePlayer.mulligans} after keeping.</p>}
          <div className="opening-hand-actions">
            <button type="button" className="control-button" onClick={() => onMulligan(activePlayer.id)}>
              <RotateCw size={16} />
              Mulligan
            </button>
            <button type="button" className="control-button primary" onClick={() => onKeepOpeningHand(activePlayer.id)}>
              <Check size={16} />
              {keepLabel}
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}

function noopDragStart(_zone: ZoneName, _card: CardInstance, _point: DragPoint) {
  return undefined;
}

function noopDragMove(_point: DragPoint) {
  return undefined;
}
