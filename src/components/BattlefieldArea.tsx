import { Fragment, useEffect, useMemo, useState } from "react";
import type { CardInstance, DragPoint, PlayerId, SelectedCard, ZoneName } from "../types";
import { getLandStackManaSummary, isLandCard } from "../utils/cards";
import { CardThumb } from "./CardThumb";

type BattlefieldItem =
  | { kind: "card"; card: CardInstance }
  | { kind: "land-stack"; key: string; name: string; cards: CardInstance[] };

const LAND_STACK_KEY = "lands";
const LAND_STACK_NAME = "Lands";

type BattlefieldAreaProps = {
  playerId: PlayerId;
  cards: CardInstance[];
  selected?: SelectedCard;
  swapTarget?: SelectedCard;
  canDrop?: boolean;
  isDropTarget?: boolean;
  compact?: boolean;
  stackLands?: boolean;
  onCardTap: (zone: ZoneName, card: CardInstance) => void;
  onInspectCard: (card: CardInstance) => void;
  onCardDragStart: (zone: ZoneName, card: CardInstance, point: DragPoint) => void;
  onCardDragMove: (point: DragPoint) => void;
  onCardDragEnd: (point: DragPoint) => void;
};

export function BattlefieldArea({
  playerId,
  cards,
  selected,
  swapTarget,
  canDrop,
  isDropTarget,
  compact,
  stackLands,
  onCardTap,
  onInspectCard,
  onCardDragStart,
  onCardDragMove,
  onCardDragEnd,
}: BattlefieldAreaProps) {
  const [expandedStackKeys, setExpandedStackKeys] = useState<Set<string>>(() => new Set());
  const items = useMemo(() => buildBattlefieldItems(cards, Boolean(stackLands)), [cards, stackLands]);

  useEffect(() => {
    const stackKeys = new Set(items.filter((item) => item.kind === "land-stack").map((item) => item.key));
    setExpandedStackKeys((current) => {
      const next = new Set([...current].filter((key) => stackKeys.has(key)));
      return next.size === current.size ? current : next;
    });
  }, [items]);

  const toggleStack = (key: string) => {
    setExpandedStackKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  return (
    <section
      className={[
        "battlefield-area",
        compact ? "is-compact" : "",
        canDrop ? "can-drop" : "",
        isDropTarget ? "is-drop-target" : "",
      ].join(" ")}
      data-drop-zone="battlefield"
      data-player-id={playerId}
      aria-label="Battlefield"
    >
      <header className="surface-header">
        <span>Battlefield</span>
        <strong>{cards.length}</strong>
      </header>
      {cards.length === 0 ? (
        <div className="battlefield-empty">Play cards here.</div>
      ) : (
        <div className="battlefield-grid">
          {items.map((item) => {
            if (item.kind === "card") {
              return (
                <BattlefieldCardThumb
                  key={item.card.instanceId}
                  playerId={playerId}
                  card={item.card}
                  selected={selected}
                  swapTarget={swapTarget}
                  compact={compact}
                  onCardTap={onCardTap}
                  onInspectCard={onInspectCard}
                  onCardDragStart={onCardDragStart}
                  onCardDragMove={onCardDragMove}
                  onCardDragEnd={onCardDragEnd}
                />
              );
            }

            const selectedInStack =
              selected?.zone === "battlefield" && item.cards.some((card) => card.instanceId === selected.instanceId);
            const swapTargetInStack =
              swapTarget?.zone === "battlefield" && item.cards.some((card) => card.instanceId === swapTarget.instanceId);
            const isExpanded = expandedStackKeys.has(item.key) || selectedInStack || swapTargetInStack;

            return (
              <LandStack
                key={item.key}
                playerId={playerId}
                stackKey={item.key}
                name={item.name}
                cards={item.cards}
                expanded={isExpanded}
                selected={selected}
                swapTarget={swapTarget}
                compact={compact}
                onToggle={toggleStack}
                onCardTap={onCardTap}
                onInspectCard={onInspectCard}
                onCardDragStart={onCardDragStart}
                onCardDragMove={onCardDragMove}
                onCardDragEnd={onCardDragEnd}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

type BattlefieldCardThumbProps = {
  playerId: PlayerId;
  card: CardInstance;
  selected?: SelectedCard;
  swapTarget?: SelectedCard;
  compact?: boolean;
  onCardTap: (zone: ZoneName, card: CardInstance) => void;
  onInspectCard: (card: CardInstance) => void;
  onCardDragStart: (zone: ZoneName, card: CardInstance, point: DragPoint) => void;
  onCardDragMove: (point: DragPoint) => void;
  onCardDragEnd: (point: DragPoint) => void;
};

function BattlefieldCardThumb({
  playerId,
  card,
  selected,
  swapTarget,
  compact,
  onCardTap,
  onInspectCard,
  onCardDragStart,
  onCardDragMove,
  onCardDragEnd,
}: BattlefieldCardThumbProps) {
  return (
    <CardThumb
      playerId={playerId}
      card={card}
      zone="battlefield"
      compact={compact}
      selected={selected?.zone === "battlefield" && selected.instanceId === card.instanceId}
      swapTarget={swapTarget?.zone === "battlefield" && swapTarget.instanceId === card.instanceId}
      onTap={(nextCard) => onCardTap("battlefield", nextCard)}
      onInspect={onInspectCard}
      onDragStart={(nextCard, point) => onCardDragStart("battlefield", nextCard, point)}
      onDragMove={onCardDragMove}
      onDragEnd={onCardDragEnd}
    />
  );
}

type LandStackProps = {
  playerId: PlayerId;
  stackKey: string;
  name: string;
  cards: CardInstance[];
  expanded: boolean;
  selected?: SelectedCard;
  swapTarget?: SelectedCard;
  compact?: boolean;
  onToggle: (key: string) => void;
  onCardTap: (zone: ZoneName, card: CardInstance) => void;
  onInspectCard: (card: CardInstance) => void;
  onCardDragStart: (zone: ZoneName, card: CardInstance, point: DragPoint) => void;
  onCardDragMove: (point: DragPoint) => void;
  onCardDragEnd: (point: DragPoint) => void;
};

function LandStack({
  playerId,
  stackKey,
  name,
  cards,
  expanded,
  selected,
  swapTarget,
  compact,
  onToggle,
  onCardTap,
  onInspectCard,
  onCardDragStart,
  onCardDragMove,
  onCardDragEnd,
}: LandStackProps) {
  const topCard = cards[0];
  const tappedCount = cards.filter((card) => card.tapped).length;
  const manaSummary = getLandStackManaSummary(cards);
  const selectedInStack = selected?.zone === "battlefield" && cards.some((card) => card.instanceId === selected.instanceId);

  return (
    <div className={["land-stack", expanded ? "is-expanded" : "", selectedInStack ? "has-selected" : ""].join(" ")}>
      <button
        type="button"
        className="land-stack-summary"
        aria-expanded={expanded}
        aria-label={`${name} land stack, ${cards.length} cards${manaSummary ? `, produces ${manaSummary.ariaLabel}` : ""}${
          tappedCount ? `, ${tappedCount} tapped` : ""
        }`}
        onClick={() => onToggle(stackKey)}
      >
        <span className="land-stack-art" aria-hidden="true">
          {topCard.imageUrl ? (
            <img src={topCard.imageUrl} alt="" draggable={false} />
          ) : (
            <span>{name.slice(0, 1)}</span>
          )}
        </span>
        <span className="land-stack-copy">
          <strong>{name}</strong>
          {manaSummary && (
            <span className="land-stack-mana" aria-label={`Produces ${manaSummary.ariaLabel}`}>
              {manaSummary.parts.map((part) => (
                <span key={part.key} className={["mana-chip", part.symbols.length > 1 ? "is-choice" : ""].join(" ")}>
                  {part.symbols.length === 2 ? (
                    <span className="mana-choice-symbol" aria-hidden="true">
                      {part.symbols.map((symbol) => (
                        <span key={symbol} className={`mana-choice-half mana-${symbol.toLowerCase()}`}>
                          {symbol}
                        </span>
                      ))}
                    </span>
                  ) : part.symbols.length > 0 ? (
                    part.symbols.map((symbol, index) => (
                      <Fragment key={symbol}>
                        {index > 0 && <span className="mana-choice-label">or</span>}
                        <span className={`mana-symbol mana-${symbol.toLowerCase()}`}>
                          {symbol}
                        </span>
                      </Fragment>
                    ))
                  ) : (
                    <span className="mana-any">Any</span>
                  )}
                  {(part.count && part.count > 1) || part.variable ? (
                    <span className="mana-count">{part.variable ? "var" : `x${part.count}`}</span>
                  ) : null}
                </span>
              ))}
            </span>
          )}
          <small>{tappedCount ? `${tappedCount} tapped` : topCard.typeLine ?? "Land"}</small>
        </span>
        <span className="land-stack-count">{cards.length}</span>
      </button>

      {expanded && (
        <div className="land-stack-cards">
          {cards.map((card) => (
            <BattlefieldCardThumb
              key={card.instanceId}
              playerId={playerId}
              card={card}
              selected={selected}
              swapTarget={swapTarget}
              compact={compact}
              onCardTap={onCardTap}
              onInspectCard={onInspectCard}
              onCardDragStart={onCardDragStart}
              onCardDragMove={onCardDragMove}
              onCardDragEnd={onCardDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function buildBattlefieldItems(cards: CardInstance[], stackLands: boolean): BattlefieldItem[] {
  if (!stackLands) {
    return cards.map((card) => ({ kind: "card", card }));
  }

  const items: BattlefieldItem[] = [];
  let landStack: Extract<BattlefieldItem, { kind: "land-stack" }> | undefined;

  for (const card of cards) {
    if (!isLandCard(card)) {
      items.push({ kind: "card", card });
      continue;
    }

    if (landStack) {
      landStack.cards.push(card);
      continue;
    }

    landStack = {
      kind: "land-stack",
      key: LAND_STACK_KEY,
      name: LAND_STACK_NAME,
      cards: [card],
    };

    items.push(landStack);
  }

  return items;
}
