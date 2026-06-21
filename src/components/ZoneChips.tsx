import { useRef } from "react";
import type { PointerEvent } from "react";
import type { CardInstance, DragPoint, PlayerId, PlayerState, ZoneName } from "../types";

const LONG_PRESS_MS = 520;
const DRAG_THRESHOLD = 12;

type ZoneChipsProps = {
  player: PlayerState;
  canDropToPlayer?: boolean;
  dragTargetPlayerId?: PlayerId;
  dragTargetZone?: ZoneName;
  openZone?: ZoneName | null;
  onSelectZone?: (zone: ZoneName) => void;
  onToggleZone?: (zone: ZoneName) => void;
  onLibraryLongPress?: () => void;
  onZoneLongPress?: (zone: ZoneName) => void;
  onLibraryDragStart?: (card: CardInstance, point: DragPoint) => void;
  onLibraryDragMove?: (point: DragPoint) => void;
  onLibraryDragEnd?: (point: DragPoint) => void;
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
  onZoneLongPress,
  onLibraryDragStart,
  onLibraryDragMove,
  onLibraryDragEnd,
}: ZoneChipsProps) {
  const longPressTimer = useRef<number>();
  const suppressZoneClick = useRef<ZoneName | null>(null);
  const pointerStart = useRef<DragPoint | null>(null);
  const draggingLibrary = useRef(false);

  const handleZoneClick = (zone: ZoneName) => {
    if (suppressZoneClick.current === zone) {
      suppressZoneClick.current = null;
      return;
    }

    if (onSelectZone) {
      onSelectZone(zone);
      return;
    }

    onToggleZone?.(zone);
  };
  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  };
  const handleLibraryPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (player.zones.library.length === 0) {
      return;
    }

    pointerStart.current = { x: event.clientX, y: event.clientY };
    draggingLibrary.current = false;

    if (onLibraryDragStart) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    if (!onLibraryLongPress) {
      return;
    }

    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      suppressZoneClick.current = "library";
      pointerStart.current = null;
      onLibraryLongPress();
    }, LONG_PRESS_MS);
  };
  const handleLibraryPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = pointerStart.current;
    const topCard = player.zones.library[0];

    if (!start || !topCard || !onLibraryDragStart) {
      return;
    }

    const point = { x: event.clientX, y: event.clientY };
    const distance = Math.hypot(point.x - start.x, point.y - start.y);

    if (!draggingLibrary.current && distance < DRAG_THRESHOLD) {
      return;
    }

    clearLongPress();
    event.preventDefault();

    if (!draggingLibrary.current) {
      draggingLibrary.current = true;
      suppressZoneClick.current = "library";
      onLibraryDragStart(topCard, point);
    }

    onLibraryDragMove?.(point);
  };
  const finishLibraryPointer = (event: PointerEvent<HTMLButtonElement>) => {
    clearLongPress();

    if (draggingLibrary.current) {
      suppressZoneClick.current = "library";
      onLibraryDragEnd?.({ x: event.clientX, y: event.clientY });
    }

    draggingLibrary.current = false;
    pointerStart.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const handleZonePointerDown = (zone: ZoneName) => {
    if (!onZoneLongPress) {
      return;
    }

    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      suppressZoneClick.current = zone;
      onZoneLongPress(zone);
    }, LONG_PRESS_MS);
  };

  return (
    <div className="zone-chips" aria-label={`${player.name} zone counts`}>
      <button
        type="button"
        className={chipClass("library", canDropToPlayer, dragTargetPlayerId, dragTargetZone, openZone === "library")}
        data-drop-zone="library"
        data-player-id={player.id}
        aria-label={`${player.name} library, ${player.zones.library.length} cards`}
        title="Long press for library options"
        onPointerDown={handleLibraryPointerDown}
        onPointerMove={handleLibraryPointerMove}
        onPointerUp={finishLibraryPointer}
        onPointerLeave={clearLongPress}
        onPointerCancel={finishLibraryPointer}
        onLostPointerCapture={finishLibraryPointer}
        onContextMenu={(event) => event.preventDefault()}
        onClick={() => handleZoneClick("library")}
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
        title="Press to open graveyard"
        onPointerDown={() => handleZonePointerDown("graveyard")}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
        onPointerCancel={clearLongPress}
        onContextMenu={(event) => event.preventDefault()}
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
        title="Press to open exile"
        onPointerDown={() => handleZonePointerDown("exile")}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
        onPointerCancel={clearLongPress}
        onContextMenu={(event) => event.preventDefault()}
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
