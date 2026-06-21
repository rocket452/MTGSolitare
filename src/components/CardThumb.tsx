import { type PointerEvent, useRef } from "react";
import type { CardInstance, DragPoint, PlayerId, ZoneName } from "../types";
import { getDisplayedPowerToughness, isCreatureCard } from "../utils/cards";
import { getGenericCounterCount, getPlusOneCounterCount } from "../utils/game";

const DRAG_THRESHOLD = 12;
const TOUCH_SCROLL_THRESHOLD = 8;

type CardThumbProps = {
  playerId: PlayerId;
  card: CardInstance;
  zone: ZoneName;
  selected: boolean;
  swapTarget?: boolean;
  compact?: boolean;
  stackCount?: number;
  onTap: (card: CardInstance) => void;
  onInspect: (card: CardInstance) => void;
  onDragStart?: (card: CardInstance, point: DragPoint) => void;
  onDragMove?: (point: DragPoint) => void;
  onDragEnd?: (point: DragPoint) => void;
};

export function CardThumb({
  playerId,
  card,
  zone,
  selected,
  swapTarget,
  compact,
  stackCount = 1,
  onTap,
  onInspect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: CardThumbProps) {
  const longPressTimer = useRef<number>();
  const longPressFired = useRef(false);
  const lastTapAt = useRef(0);
  const pointerStart = useRef<DragPoint | null>(null);
  const dragging = useRef(false);
  const suppressClick = useRef(false);
  const isBattlefieldTapped = zone === "battlefield" && card.tapped;
  const isHandCard = zone === "hand";
  const hasStackCount = isHandCard && stackCount > 1;
  const plusOneCounters = getPlusOneCounterCount(card);
  const genericCounters = getGenericCounterCount(card);
  const displayedPowerToughness = zone === "battlefield" && isCreatureCard(card) ? getDisplayedPowerToughness(card) : undefined;

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    longPressFired.current = false;
    suppressClick.current = false;
    dragging.current = false;
    pointerStart.current = { x: event.clientX, y: event.clientY };

    if (!(isHandCard && event.pointerType === "touch")) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      pointerStart.current = null;
      onInspect(card);
    }, 520);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = pointerStart.current;

    if (!start || longPressFired.current) {
      return;
    }

    const point = { x: event.clientX, y: event.clientY };
    const deltaX = point.x - start.x;
    const deltaY = point.y - start.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (
      isHandCard &&
      event.pointerType === "touch" &&
      Math.abs(deltaX) > TOUCH_SCROLL_THRESHOLD &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      clearLongPress();
      suppressClick.current = true;
      pointerStart.current = null;
      return;
    }

    if (!dragging.current && distance < DRAG_THRESHOLD) {
      return;
    }

    clearLongPress();
    event.preventDefault();

    if (!dragging.current) {
      dragging.current = true;
      suppressClick.current = true;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      onDragStart?.(card, point);
    }

    onDragMove?.(point);
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    clearLongPress();

    if (dragging.current) {
      suppressClick.current = true;
      onDragEnd?.({ x: event.clientX, y: event.clientY });
    }

    dragging.current = false;
    pointerStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    clearLongPress();

    if (dragging.current) {
      suppressClick.current = true;
      onDragEnd?.({ x: event.clientX, y: event.clientY });
    }

    dragging.current = false;
    pointerStart.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }

    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }

    const now = Date.now();
    if (isHandCard) {
      lastTapAt.current = now;
      onInspect(card);
      return;
    }

    if (now - lastTapAt.current < 300) {
      lastTapAt.current = 0;
      onInspect(card);
      return;
    }

    lastTapAt.current = now;
    onTap(card);
  };

  return (
    <span className={["card-thumb-shell", isHandCard ? "is-hand-card" : "", hasStackCount ? "is-card-stack" : ""].join(" ")}>
      <button
        className={[
          "card-thumb",
          isHandCard ? "is-hand-card" : "",
          compact ? "is-compact" : "",
          selected ? "is-selected" : "",
          swapTarget ? "is-swap-target" : "",
          isBattlefieldTapped ? "is-tapped" : "",
          card.isToken ? "is-token" : "",
        ].join(" ")}
        type="button"
        title={isHandCard ? `${card.name}${hasStackCount ? `, ${stackCount} copies` : ""}. Tap or hold to view full card.` : card.name}
        aria-label={hasStackCount ? `${card.name}, ${stackCount} copies` : card.name}
        data-card-id={card.instanceId}
        data-card-zone={zone}
        data-player-id={playerId}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
        onPointerLeave={clearLongPress}
        onClick={handleClick}
        onDoubleClick={(event) => {
          event.preventDefault();
          onInspect(card);
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className="card-visual">
          {card.imageUrl ? (
            <img src={card.imageUrl} alt={card.name} draggable={false} />
          ) : (
            <span className="token-face">
              <span>{card.isToken ? "Token" : "Card"}</span>
              <strong>{card.name}</strong>
            </span>
          )}
        </span>
        {hasStackCount && <span className="stack-count-badge">x{stackCount}</span>}
        {plusOneCounters !== 0 && (
          <span className={["counter-badge", plusOneCounters > 0 ? "is-plus-one" : "is-minus-one"].join(" ")}>
            {plusOneCounters > 0 ? `+${plusOneCounters}` : plusOneCounters}
          </span>
        )}
        {genericCounters > 0 && <span className="counter-badge is-generic">{genericCounters}</span>}
        {displayedPowerToughness && (
          <span className="pt-badge">
            {displayedPowerToughness.power}/{displayedPowerToughness.toughness}
          </span>
        )}
      </button>
    </span>
  );
}
