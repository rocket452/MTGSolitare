import { useRef } from "react";
import type { PlayerId, PlayerState, ZoneName } from "../types";

const LONG_PRESS_MS = 520;

type ZoneChipsProps = {
  player: PlayerState;
  canDropToPlayer?: boolean;
  dragTargetPlayerId?: PlayerId;
  dragTargetZone?: ZoneName;
  openZone?: ZoneName | null;
  onSelectZone?: (zone: ZoneName) => void;
  onToggleZone?: (zone: ZoneName) => void;
  onLibraryLongPress?: () => void;
};

export function ZoneChips({
  player,
  canDropToPlayer,
  dragTargetPlayerId,
  dragTargetZone,
  openZone,
  onSelectZone,
  onToggleZone,
  onLibraryLongPress,
}: ZoneChipsProps) {
  const longPressTimer = useRef<number>();
  const suppressLibraryClick = useRef(false);

  const handleZoneClick = (zone: ZoneName) => {
    if (onSelectZone) {
      onSelectZone(zone);
      return;
    }

    onToggleZone?.(zone);
  };
  const clearLibraryLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  };
  const handleLibraryPointerDown = () => {
    if (!onLibraryLongPress || player.zones.library.length === 0) {
      return;
    }

    clearLibraryLongPress();
    longPressTimer.current = window.setTimeout(() => {
      suppressLibraryClick.current = true;
      onLibraryLongPress();
    }, LONG_PRESS_MS);
  };
  const handleLibraryClick = () => {
    if (suppressLibraryClick.current) {
      suppressLibraryClick.current = false;
      return;
    }

    handleZoneClick("library");
  };

  return (
    <div className="zone-chips" aria-label={`${player.name} zone counts`}>
      <button
        type="button"
        className={chipClass("library", canDropToPlayer, dragTargetPlayerId, dragTargetZone, openZone === "library")}
        data-drop-zone="library"
        data-player-id={player.id}
        aria-label={`${player.name} library, ${player.zones.library.length} cards`}
        title="Long press to search library"
        onPointerDown={handleLibraryPointerDown}
        onPointerUp={clearLibraryLongPress}
        onPointerLeave={clearLibraryLongPress}
        onPointerCancel={clearLibraryLongPress}
        onContextMenu={(event) => event.preventDefault()}
        onClick={handleLibraryClick}
      >
        <span>Library</span>
        <strong>{player.zones.library.length}</strong>
      </button>
      <button
        type="button"
        className={chipClass("graveyard", canDropToPlayer, dragTargetPlayerId, dragTargetZone, openZone === "graveyard")}
        data-drop-zone="graveyard"
        data-player-id={player.id}
        aria-label={`${player.name} graveyard, ${player.zones.graveyard.length} cards`}
        onClick={() => handleZoneClick("graveyard")}
      >
        <span>Grave</span>
        <strong>{player.zones.graveyard.length}</strong>
      </button>
      <button
        type="button"
        className={chipClass("exile", canDropToPlayer, dragTargetPlayerId, dragTargetZone, openZone === "exile")}
        data-drop-zone="exile"
        data-player-id={player.id}
        aria-label={`${player.name} exile, ${player.zones.exile.length} cards`}
        onClick={() => handleZoneClick("exile")}
      >
        <span>Exile</span>
        <strong>{player.zones.exile.length}</strong>
      </button>
    </div>
  );
}

function chipClass(
  zone: ZoneName,
  canDropToPlayer?: boolean,
  dragTargetPlayerId?: PlayerId,
  dragTargetZone?: ZoneName,
  isOpen?: boolean,
) {
  return [
    "zone-chip",
    canDropToPlayer ? "can-drop" : "",
    dragTargetPlayerId && dragTargetZone === zone ? "is-drop-target" : "",
    isOpen ? "is-open" : "",
  ].join(" ");
}
