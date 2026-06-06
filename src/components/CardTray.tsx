import type { CardInstance, DragPoint, PlayerId, SelectedCard, ZoneName } from "../types";
import { CardThumb } from "./CardThumb";

type CardGroup = {
  key: string;
  card: CardInstance;
  cards: CardInstance[];
};

type CardTrayProps = {
  playerId: PlayerId;
  title: string;
  zoneName: ZoneName;
  cards: CardInstance[];
  selected?: SelectedCard;
  swapTarget?: SelectedCard;
  compact?: boolean;
  groupHandCards?: boolean;
  emptyText: string;
  onCardTap: (zone: ZoneName, card: CardInstance) => void;
  onInspectCard: (card: CardInstance) => void;
  onCardDragStart: (zone: ZoneName, card: CardInstance, point: DragPoint) => void;
  onCardDragMove: (point: DragPoint) => void;
  onCardDragEnd: (point: DragPoint) => void;
};

export function CardTray({
  playerId,
  title,
  zoneName,
  cards,
  selected,
  swapTarget,
  compact,
  groupHandCards = true,
  emptyText,
  onCardTap,
  onInspectCard,
  onCardDragStart,
  onCardDragMove,
  onCardDragEnd,
}: CardTrayProps) {
  const cardGroups = zoneName === "hand" && groupHandCards ? buildHandCardGroups(cards) : cards.map((card) => ({
    key: card.instanceId,
    card,
    cards: [card],
  }));

  return (
    <section
      className={["card-tray", zoneName === "hand" ? "is-hand-tray" : "", compact ? "is-compact" : ""].join(" ")}
      data-drop-zone={zoneName}
      data-player-id={playerId}
    >
      <header className="tray-header">
        <span>{title}</span>
        <strong>{cards.length}</strong>
      </header>
      {cards.length === 0 ? (
        <div className="tray-empty">{emptyText}</div>
      ) : (
        <div className="tray-scroll">
          {cardGroups.map((group) => (
            <CardThumb
              key={group.key}
              playerId={playerId}
              card={group.card}
              zone={zoneName}
              compact={compact}
              selected={selected?.zone === zoneName && group.cards.some((card) => selected.instanceId === card.instanceId)}
              swapTarget={swapTarget?.zone === zoneName && group.cards.some((card) => swapTarget.instanceId === card.instanceId)}
              stackCount={group.cards.length}
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

function buildHandCardGroups(cards: CardInstance[]): CardGroup[] {
  const groups = new Map<string, CardGroup>();

  for (const card of cards) {
    const key = getHandCardGroupKey(card);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.cards.push(card);
      continue;
    }

    groups.set(key, {
      key,
      card,
      cards: [card],
    });
  }

  return [...groups.values()];
}

function getHandCardGroupKey(card: CardInstance): string {
  return card.name.trim().toLowerCase();
}
