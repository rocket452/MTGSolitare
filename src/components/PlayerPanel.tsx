import { useEffect, useState } from "react";
import { Archive, Biohazard, Check, Dices, Eye, FilePlus, Minus, MoreHorizontal, Plus, RotateCcw, RotateCw, Search, Sparkles, Zap } from "lucide-react";
import type { CardInstance, DragPoint, PlayerId, PlayerState, SelectedCard, TokenDefinition, ZoneName } from "../types";
import { BattlefieldArea } from "./BattlefieldArea";
import { CardTray } from "./CardTray";
import { LibrarySearchModal } from "./LibrarySearchModal";
import { LifeTracker } from "./LifeTracker";
import { PeekLibraryModal } from "./PeekLibraryModal";
import { TokenPickerModal } from "./TokenPickerModal";
import { ZoneCardsModal } from "./ZoneCardsModal";
import { ZoneChips } from "./ZoneChips";

type PlayerPanelProps = {
  player: PlayerState;
  isActive: boolean;
  selected?: SelectedCard;
  swapTarget?: SelectedCard;
  dragTargetPlayerId?: PlayerId;
  dragTargetZone?: ZoneName;
  dragSourcePlayerId?: PlayerId;
  isDraggingCard?: boolean;
  handFlashTrigger?: number;
  stackLands: boolean;
  onCardTap: (playerId: PlayerId, zone: ZoneName, card: CardInstance) => void;
  onInspectCard: (card: CardInstance) => void;
  onCardDragStart: (playerId: PlayerId, zone: ZoneName, card: CardInstance, point: DragPoint) => void;
  onCardDragMove: (point: DragPoint) => void;
  onCardDragEnd: (point: DragPoint) => void;
  onLifeChange: (playerId: PlayerId, delta: number) => void;
  onEnergyChange: (playerId: PlayerId, delta: number) => void;
  onPoisonChange: (playerId: PlayerId, delta: number) => void;
  undoDisabled: boolean;
  onUndo: () => void;
  onShuffle: (playerId: PlayerId) => void;
  onCreateToken: (playerId: PlayerId, token: TokenDefinition, quantity: number, tapped: boolean) => void;
  onDiscardRandom: (playerId: PlayerId, count: number) => void;
  onReorderTopLibrary: (playerId: PlayerId, orderedInstanceIds: string[]) => void;
  onMoveLibraryCardsToBottom: (playerId: PlayerId, instanceIds: string[]) => void;
  onMoveLibraryCardsToGraveyard: (playerId: PlayerId, instanceIds: string[]) => void;
  onMoveLibraryCard: (playerId: PlayerId, instanceId: string, destination: ZoneName, libraryPosition?: "top" | "bottom") => void;
  onMoveCardToZone: (playerId: PlayerId, sourceZone: ZoneName, instanceId: string, destination: ZoneName, libraryPosition?: "top" | "bottom") => void;
  onMulligan: (playerId: PlayerId) => void;
  onKeepOpeningHand: (playerId: PlayerId) => void;
  onStackLandsChange: (enabled: boolean) => void;
  onNewGame: () => void;
};

export function PlayerPanel(props: PlayerPanelProps) {
  return props.isActive ? <ActivePlayerPanel {...props} /> : <PlayerCompactPanel {...props} />;
}

function ActivePlayerPanel({
  player,
  selected,
  swapTarget,
  dragTargetPlayerId,
  dragTargetZone,
  dragSourcePlayerId,
  isDraggingCard,
  handFlashTrigger,
  stackLands,
  onCardTap,
  onInspectCard,
  onCardDragStart,
  onCardDragMove,
  onCardDragEnd,
  onLifeChange,
  onEnergyChange,
  onPoisonChange,
  undoDisabled,
  onUndo,
  onShuffle,
  onCreateToken,
  onDiscardRandom,
  onReorderTopLibrary,
  onMoveLibraryCardsToBottom,
  onMoveLibraryCardsToGraveyard,
  onMoveLibraryCard,
  onMoveCardToZone,
  onMulligan,
  onKeepOpeningHand,
  onStackLandsChange,
  onNewGame,
}: PlayerPanelProps) {
  const selectedForPlayer = selected?.playerId === player.id ? selected : undefined;
  const canDropToPlayer = isDraggingCard && dragSourcePlayerId === player.id;
  const playerSwapTarget = swapTarget?.playerId === player.id ? swapTarget : undefined;
  const playerDragTargetZone = dragTargetPlayerId === player.id ? dragTargetZone : undefined;
  const [isRandomDiscardOpen, setIsRandomDiscardOpen] = useState(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const [isLibraryActionsOpen, setIsLibraryActionsOpen] = useState(false);
  const [isPeekOpen, setIsPeekOpen] = useState(false);
  const [isLibrarySearchOpen, setIsLibrarySearchOpen] = useState(false);
  const [openCardZone, setOpenCardZone] = useState<Extract<ZoneName, "graveyard" | "exile"> | null>(null);
  const [isTokenPickerOpen, setIsTokenPickerOpen] = useState(false);
  const [shuffleMessage, setShuffleMessage] = useState("");
  const handCount = player.zones.hand.length;
  const randomDiscardOptions = Array.from({ length: handCount }, (_, index) => index + 1);
  const handleShuffle = () => {
    onShuffle(player.id);
    setIsMoreActionsOpen(false);
    setShuffleMessage("Library shuffled");
  };
  const handleRandomDiscard = (count: number) => {
    onDiscardRandom(player.id, count);
    setIsRandomDiscardOpen(false);
  };
  const handleOpenPeek = () => {
    setIsMoreActionsOpen(false);
    setIsLibraryActionsOpen(false);
    setIsPeekOpen(true);
  };
  const handleClosePeek = () => {
    setIsPeekOpen(false);
    onShuffle(player.id);
    setShuffleMessage("Library shuffled");
  };
  const handleOpenLibrarySearch = () => {
    setIsMoreActionsOpen(false);
    setIsLibraryActionsOpen(false);
    setIsLibrarySearchOpen(true);
  };
  const handleOpenTokenPicker = () => {
    setIsMoreActionsOpen(false);
    setIsTokenPickerOpen(true);
  };
  const handleOpenCardZone = (zone: ZoneName) => {
    if (zone === "graveyard" || zone === "exile") {
      setOpenCardZone(zone);
    }
  };

  useEffect(() => {
    if (!shuffleMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setShuffleMessage(""), 1600);
    return () => window.clearTimeout(timeoutId);
  }, [shuffleMessage]);

  return (
    <section className={["player-panel", `player-${player.id.toLowerCase()}`, "is-active"].join(" ")}>
      <div className="active-player-panel">
        <header className="active-player-header">
          <div className="player-title">
            <span className="player-mark">{player.id}</span>
            <div>
              <h1>{player.name}</h1>
              <p>Active - Mulls {player.mulligans}{player.poison > 0 ? ` - Poison ${player.poison}` : ""}</p>
            </div>
          </div>
          <LifeTracker playerName={player.name} life={player.life} onChange={(delta) => onLifeChange(player.id, delta)} />
        </header>

        <div className="active-primary-row">
          <button type="button" className="undo-button" onClick={onUndo} disabled={undoDisabled}>
            <RotateCcw size={19} />
            Undo
          </button>
          <details
            className="more-actions"
            open={isMoreActionsOpen}
            onToggle={(event) => setIsMoreActionsOpen(event.currentTarget.open)}
          >
            <summary>
              <MoreHorizontal size={20} />
              More
            </summary>
            <div className="more-actions-menu">
              <button type="button" onClick={handleShuffle}>
                <Dices size={16} />
                Shuffle
              </button>
              <button type="button" onClick={handleOpenTokenPicker}>
                <Sparkles size={16} />
                Token
              </button>
              <button type="button" disabled={handCount === 0} onClick={() => setIsRandomDiscardOpen(true)}>
                <Archive size={16} />
                Discard Random
              </button>
              <button type="button" disabled={player.zones.library.length === 0} onClick={handleOpenPeek}>
                <Eye size={16} />
                Peek Library
              </button>
              <button type="button" disabled={player.zones.library.length === 0} onClick={handleOpenLibrarySearch}>
                <Search size={16} />
                Search Library
              </button>
              <div className="energy-control" role="group" aria-label={`${player.name} energy counters`}>
                <span className="energy-label">
                  <Zap size={16} />
                  Energy
                </span>
                <div className="energy-stepper">
                  <button
                    type="button"
                    aria-label={`${player.name} loses 1 energy`}
                    disabled={player.energy <= 0}
                    onClick={() => onEnergyChange(player.id, -1)}
                  >
                    <Minus size={16} />
                  </button>
                  <strong aria-label={`${player.energy} energy`}>{player.energy}</strong>
                  <button
                    type="button"
                    aria-label={`${player.name} gains 1 energy`}
                    onClick={() => onEnergyChange(player.id, 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="energy-control poison-control" role="group" aria-label={`${player.name} poison counters`}>
                <span className="energy-label poison-label">
                  <Biohazard size={16} />
                  Poison
                </span>
                <div className="energy-stepper">
                  <button
                    type="button"
                    aria-label={`${player.name} loses 1 poison counter`}
                    disabled={player.poison <= 0}
                    onClick={() => onPoisonChange(player.id, -1)}
                  >
                    <Minus size={16} />
                  </button>
                  <strong aria-label={`${player.poison} poison counters`}>{player.poison}</strong>
                  <button
                    type="button"
                    aria-label={`${player.name} gains 1 poison counter`}
                    onClick={() => onPoisonChange(player.id, 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <label className="more-toggle">
                <input
                  type="checkbox"
                  checked={stackLands}
                  onChange={(event) => onStackLandsChange(event.currentTarget.checked)}
                />
                <span>Stack lands</span>
              </label>
              <button type="button" onClick={onNewGame}>
                <FilePlus size={16} />
                New game
              </button>
            </div>
          </details>
          {shuffleMessage && (
            <div className="shuffle-confirmation" role="status" aria-live="polite">
              {shuffleMessage}
            </div>
          )}
        </div>

        {isRandomDiscardOpen && (
          <div className="discard-picker-backdrop" role="dialog" aria-modal="true" aria-labelledby={`${player.id}-discard-title`} onClick={() => setIsRandomDiscardOpen(false)}>
            <div className="discard-picker" onClick={(event) => event.stopPropagation()}>
              <header>
                <h2 id={`${player.id}-discard-title`}>Discard Random</h2>
                <span>{handCount} in hand</span>
              </header>
              <div className="discard-picker-options">
                {randomDiscardOptions.map((count) => (
                  <button key={count} type="button" onClick={() => handleRandomDiscard(count)}>
                    {count}
                  </button>
                ))}
              </div>
              <button type="button" className="discard-picker-cancel" onClick={() => setIsRandomDiscardOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {isPeekOpen && (
          <PeekLibraryModal
            playerId={player.id}
            playerName={player.name}
            library={player.zones.library}
            onInspectCard={onInspectCard}
            onReorderTopCards={(orderedInstanceIds) => onReorderTopLibrary(player.id, orderedInstanceIds)}
            onMoveCard={(instanceId, destination, libraryPosition) =>
              onMoveLibraryCard(player.id, instanceId, destination, libraryPosition)
            }
            onMoveSelectedToBottom={(instanceIds) => onMoveLibraryCardsToBottom(player.id, instanceIds)}
            onMoveSelectedToGraveyard={(instanceIds) => onMoveLibraryCardsToGraveyard(player.id, instanceIds)}
            onClose={handleClosePeek}
          />
        )}

        {isTokenPickerOpen && (
          <TokenPickerModal
            battlefieldCards={player.zones.battlefield}
            onCreateToken={(token, quantity, tapped) => onCreateToken(player.id, token, quantity, tapped)}
            onClose={() => setIsTokenPickerOpen(false)}
          />
        )}

        {!player.openingHandKept && (
          <div className="opening-hand-panel">
            <div className="opening-hand-status">
              <span>Opening hand</span>
              <strong>Mulls {player.mulligans}</strong>
            </div>
            <button type="button" className="control-button" onClick={() => onMulligan(player.id)}>
              <RotateCw size={16} />
              Mulligan
            </button>
            <button type="button" className="control-button primary" onClick={() => onKeepOpeningHand(player.id)}>
              <Check size={16} />
              Keep
            </button>
            {player.mulligans > 0 && <p>Bottom {player.mulligans} after keeping.</p>}
          </div>
        )}

        <div className="focus-stage">
          <BattlefieldArea
            playerId={player.id}
            cards={player.zones.battlefield}
            selected={selectedForPlayer}
            swapTarget={playerSwapTarget}
            canDrop={canDropToPlayer}
            isDropTarget={dragTargetPlayerId === player.id && dragTargetZone === "battlefield"}
            stackLands={stackLands}
            onCardTap={(zone, card) => onCardTap(player.id, zone, card)}
            onInspectCard={onInspectCard}
            onCardDragStart={(zone, card, point) => onCardDragStart(player.id, zone, card, point)}
            onCardDragMove={onCardDragMove}
            onCardDragEnd={onCardDragEnd}
          />
        </div>

        <ZoneChips
          player={player}
          canDropToPlayer={canDropToPlayer}
          dragTargetPlayerId={dragTargetPlayerId === player.id ? dragTargetPlayerId : undefined}
          dragTargetZone={playerDragTargetZone}
          openZone={openCardZone}
          onSelectZone={handleOpenCardZone}
          onZoneLongPress={handleOpenCardZone}
          onLibraryPress={() => setIsLibraryActionsOpen(true)}
          onLibraryDragStart={(card, point) => onCardDragStart(player.id, "library", card, point)}
          onLibraryDragMove={onCardDragMove}
          onLibraryDragEnd={onCardDragEnd}
        />

        {isLibraryActionsOpen && (
          <div
            className="library-actions-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${player.id}-library-actions-title`}
            onClick={() => setIsLibraryActionsOpen(false)}
          >
            <div className="library-actions-sheet" onClick={(event) => event.stopPropagation()}>
              <header>
                <h2 id={`${player.id}-library-actions-title`}>Library</h2>
                <span>{player.zones.library.length} cards</span>
              </header>
              <div className="library-actions-options">
                <button type="button" onClick={handleOpenPeek}>
                  <Eye size={17} />
                  Peek
                </button>
                <button type="button" onClick={handleOpenLibrarySearch}>
                  <Search size={17} />
                  Search
                </button>
              </div>
              <button type="button" className="library-actions-cancel" onClick={() => setIsLibraryActionsOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {isLibrarySearchOpen && (
          <LibrarySearchModal
            playerId={player.id}
            playerName={player.name}
            library={player.zones.library}
            onInspectCard={onInspectCard}
            onMoveCard={(instanceId, destination, libraryPosition) =>
              onMoveLibraryCard(player.id, instanceId, destination, libraryPosition)
            }
            onClose={() => setIsLibrarySearchOpen(false)}
          />
        )}

        {openCardZone && (
          <ZoneCardsModal
            playerId={player.id}
            playerName={player.name}
            zoneName={openCardZone}
            cards={player.zones[openCardZone]}
            onInspectCard={onInspectCard}
            onMoveCard={(instanceId, destination) =>
              onMoveCardToZone(player.id, openCardZone, instanceId, destination)
            }
            onClose={() => setOpenCardZone(null)}
          />
        )}

        <CardTray
          playerId={player.id}
          title="Hand"
          zoneName="hand"
          cards={player.zones.hand}
          selected={selectedForPlayer}
          swapTarget={playerSwapTarget}
          compact
          groupHandCards={false}
          flashTrigger={handFlashTrigger}
          emptyText="Hand empty"
          onCardTap={(zone, card) => onCardTap(player.id, zone, card)}
          onInspectCard={onInspectCard}
          onCardDragStart={(zone, card, point) => onCardDragStart(player.id, zone, card, point)}
          onCardDragMove={onCardDragMove}
          onCardDragEnd={onCardDragEnd}
        />
      </div>
    </section>
  );
}

function PlayerCompactPanel({
  player,
  selected,
  swapTarget,
  dragTargetPlayerId,
  dragTargetZone,
  dragSourcePlayerId,
  isDraggingCard,
  stackLands,
  onCardTap,
  onInspectCard,
  onCardDragStart,
  onCardDragMove,
  onCardDragEnd,
  onLifeChange,
}: PlayerPanelProps) {
  const selectedForPlayer = selected?.playerId === player.id ? selected : undefined;
  const canDropToPlayer = isDraggingCard && dragSourcePlayerId === player.id;
  const hasBattlefield = player.zones.battlefield.length > 0;

  return (
    <section className={["player-panel", `player-${player.id.toLowerCase()}`, "is-inactive"].join(" ")}>
      <div className={["compact-player-panel", hasBattlefield ? "has-field" : ""].join(" ")}>
        <div className="compact-main-row">
          <div className="player-title compact-title">
            <span className="player-mark">{player.id}</span>
            <div>
              <h1>{player.name}</h1>
              <p>Inactive - Mulls {player.mulligans}{player.poison > 0 ? ` - Poison ${player.poison}` : ""}</p>
            </div>
          </div>
          <LifeTracker playerName={player.name} life={player.life} onChange={(delta) => onLifeChange(player.id, delta)} />
        </div>

        <div className="compact-counts">
          <span>Lib {player.zones.library.length}</span>
          <span>Hand {player.zones.hand.length} hidden</span>
          <span>Field {player.zones.battlefield.length}</span>
          <span>Grave {player.zones.graveyard.length}</span>
          <span>Exile {player.zones.exile.length}</span>
          {player.poison > 0 && <span>Poison {player.poison}</span>}
        </div>

        {hasBattlefield && (
          <BattlefieldArea
            playerId={player.id}
            cards={player.zones.battlefield}
            selected={selectedForPlayer}
            swapTarget={swapTarget?.playerId === player.id ? swapTarget : undefined}
            canDrop={canDropToPlayer}
            isDropTarget={dragTargetPlayerId === player.id && dragTargetZone === "battlefield"}
            compact
            stackLands={stackLands}
            onCardTap={(zone, card) => onCardTap(player.id, zone, card)}
            onInspectCard={onInspectCard}
            onCardDragStart={(zone, card, point) => onCardDragStart(player.id, zone, card, point)}
            onCardDragMove={onCardDragMove}
            onCardDragEnd={onCardDragEnd}
          />
        )}
      </div>
    </section>
  );
}
