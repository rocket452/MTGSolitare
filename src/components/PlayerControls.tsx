import { useEffect, useId, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  BadgePlus,
  ChevronDown,
  Check,
  CircleMinus,
  CirclePlus,
  Dices,
  Hand,
  Layers,
  RotateCw,
  SlidersHorizontal,
  Skull,
  Sparkles,
  Swords,
  UndoDot,
} from "lucide-react";
import type { CardInstance, SelectedCard, ZoneName } from "../types";
import { getGenericCounterCount, zoneLabels } from "../utils/game";

type PlayerControlsProps = {
  selected?: SelectedCard;
  selectedCard?: CardInstance;
  onDraw: () => void;
  onShuffle: () => void;
  onAddToken: () => void;
  mulligans: number;
  openingHandKept: boolean;
  onMulligan: () => void;
  onKeepOpeningHand: () => void;
  onMoveSelected: (zone: ZoneName, libraryPosition?: "top" | "bottom") => void;
  onAdjustCounter: (delta: number) => void;
  onToggleTapped: () => void;
};

export function PlayerControls({
  selected,
  selectedCard,
  onDraw,
  onShuffle,
  onAddToken,
  mulligans,
  openingHandKept,
  onMulligan,
  onKeepOpeningHand,
  onMoveSelected,
  onAdjustCounter,
  onToggleTapped,
}: PlayerControlsProps) {
  const menuId = useId();
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const hasSelection = Boolean(selected && selectedCard);
  const canToggleTapped = hasSelection && selected?.zone === "battlefield";
  const selectedLabel = selected && selectedCard
    ? `${selectedCard.name} in ${zoneLabels[selected.zone]}`
    : "No card selected";
  const canRemoveCounter = hasSelection && selectedCard !== undefined && getGenericCounterCount(selectedCard) > 0;

  useEffect(() => {
    setIsActionMenuOpen(false);
  }, [selected?.instanceId]);

  return (
    <div className="player-controls">
      <div className="quick-actions">
        <button type="button" className="control-button primary" onClick={onDraw}>
          <Layers size={17} />
          Draw
        </button>
        <button type="button" className="control-button" onClick={onShuffle}>
          <Dices size={17} />
          Shuffle
        </button>
        <button type="button" className="control-button" onClick={onAddToken}>
          <Sparkles size={17} />
          Token
        </button>
      </div>

      {!openingHandKept && (
        <div className="opening-hand-panel">
          <div className="opening-hand-status">
            <span>Opening hand</span>
            <strong>Mulls {mulligans}</strong>
          </div>
          <button type="button" className="control-button" onClick={onMulligan}>
            <RotateCw size={16} />
            Mulligan
          </button>
          <button type="button" className="control-button primary" onClick={onKeepOpeningHand}>
            <Check size={16} />
            Keep
          </button>
          {mulligans > 0 && <p>Bottom {mulligans} after keeping.</p>}
        </div>
      )}

      <div className="selected-action-row">
        <div className="selected-readout" title={selectedLabel}>
          {selectedLabel}
        </div>
        <button
          type="button"
          className="control-button action-menu-toggle"
          aria-controls={menuId}
          aria-expanded={isActionMenuOpen}
          disabled={!hasSelection}
          onClick={() => setIsActionMenuOpen((current) => !current)}
        >
          <SlidersHorizontal size={16} />
          Actions
          <ChevronDown className={isActionMenuOpen ? "is-open" : ""} size={16} />
        </button>
      </div>

      {isActionMenuOpen && (
        <div id={menuId} className="card-action-menu">
          <div className="move-actions">
            <button type="button" className="control-button" disabled={!hasSelection} onClick={() => onMoveSelected("battlefield")}>
              <Swords size={16} />
              Field
            </button>
            <button type="button" className="control-button" disabled={!hasSelection} onClick={() => onMoveSelected("graveyard")}>
              <Skull size={16} />
              Grave
            </button>
            <button type="button" className="control-button" disabled={!hasSelection} onClick={() => onMoveSelected("exile")}>
              <BadgePlus size={16} />
              Exile
            </button>
            <button type="button" className="control-button" disabled={!hasSelection} onClick={() => onMoveSelected("hand")}>
              <Hand size={16} />
              Hand
            </button>
            <button type="button" className="control-button" disabled={!hasSelection} onClick={() => onMoveSelected("library", "top")}>
              <ArrowUpToLine size={16} />
              Top
            </button>
            <button type="button" className="control-button" disabled={!hasSelection} onClick={() => onMoveSelected("library", "bottom")}>
              <ArrowDownToLine size={16} />
              Bottom
            </button>
          </div>

          <div className="counter-actions">
            <button type="button" className="control-button" disabled={!canToggleTapped} onClick={onToggleTapped}>
              <UndoDot size={16} />
              Tap
            </button>
            <button type="button" className="control-button" disabled={!canRemoveCounter} onClick={() => onAdjustCounter(-1)}>
              <CircleMinus size={16} />
              Counter
            </button>
            <button type="button" className="control-button" disabled={!hasSelection} onClick={() => onAdjustCounter(1)}>
              <CirclePlus size={16} />
              Counter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
