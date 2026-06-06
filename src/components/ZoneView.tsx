import type { CardInstance, DragPoint, PlayerId, SelectedCard, ZoneName } from "../types";
import { CardThumb } from "./CardThumb";

type ZoneViewProps = {
  playerId: PlayerId;
  title: string;
  zoneName: ZoneName;
  cards: CardInstance[];
  selected?: SelectedCard;
  swapTarget?: SelectedCard;
  hidden?: boolean;
  compact?: boolean;
  canDrop?: boolean;
  isDropTarget?: boolean;
  onCardTap: (zone: ZoneName, card: CardInstance) => void;
  onInspectCard: (card: CardInstance) => void;
  onCardDragStart: (zone: ZoneName, card: CardInstance, point: DragPoint) => void;
  onCardDragMove: (point: DragPoint) => void;
  onCardDragEnd: (point: DragPoint) => void;
};

export function ZoneView({
  playerId,
  title,
  zoneName,
  cards,
  selected,
  swapTarget,
  hidden,
  compact,
  canDrop,
  isDropTarget,
  onCardTap,
  onInspectCard,
  onCardDragStart,
  onCardDragMove,
  onCardDragEnd,
}: ZoneViewProps) {
  return (
    <section
      className={[
        "zone-view",
        compact ? "is-compact" : "",
        hidden ? "is-hidden-zone" : "",
        canDrop ? "can-drop" : "",
        isDropTarget ? "is-drop-target" : "",
      ].join(" ")}
      data-drop-zone={zoneName}
      data-player-id={playerId}
    >
      <header className="zone-header">
        <span>{title}</span>
        <strong>{cards.length}</strong>
      </header>

      {hidden ? (
        <div className="hidden-hand">Hand hidden</div>
      ) : cards.length === 0 ? (
        <div className="empty-zone">Empty</div>
      ) : (
        <div className="zone-card-grid">
          {/* TODO: Add battlefield stacking for duplicate cards once compact selection is settled. */}
          {cards.map((card) => (
            <CardThumb
              key={card.instanceId}
              playerId={playerId}
              card={card}
              zone={zoneName}
              compact={compact}
              selected={selected?.zone === zoneName && selected.instanceId === card.instanceId}
              swapTarget={swapTarget?.zone === zoneName && swapTarget.instanceId === card.instanceId}
              onTap={(nextCard) => onCardTap(zoneName, nextCard)}
              onInspect={onInspectCard}
              onDragStart={(nextCard, point) => onCardDragStart(zoneName, nextCard, point)}
              onDragMove={onCardDragMove}
              onDragEnd={onCardDragEnd}
            />
          ))}
        </div>
      )}
    </section>
  );
}
