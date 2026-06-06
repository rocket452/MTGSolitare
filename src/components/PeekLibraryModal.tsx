import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, ListEnd, Skull, X } from "lucide-react";
import type { CardInstance, PlayerId } from "../types";
import { CardThumb } from "./CardThumb";

type PeekLibraryModalProps = {
  playerId: PlayerId;
  playerName: string;
  library: CardInstance[];
  onInspectCard: (card: CardInstance) => void;
  onReorderTopCards: (orderedInstanceIds: string[]) => void;
  onMoveSelectedToBottom: (instanceIds: string[]) => void;
  onMoveSelectedToGraveyard: (instanceIds: string[]) => void;
  onClose: () => void;
};

const PEEK_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export function PeekLibraryModal({
  playerId,
  playerName,
  library,
  onInspectCard,
  onReorderTopCards,
  onMoveSelectedToBottom,
  onMoveSelectedToGraveyard,
  onClose,
}: PeekLibraryModalProps) {
  const [peekCount, setPeekCount] = useState(() => Math.min(4, Math.max(1, library.length)));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const shownCards = useMemo(() => library.slice(0, peekCount), [library, peekCount]);
  const selectedCount = selectedIds.size;
  const selectedIdsInShownOrder = useMemo(
    () => shownCards.filter((card) => selectedIds.has(card.instanceId)).map((card) => card.instanceId),
    [selectedIds, shownCards],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const visibleIds = new Set(shownCards.map((card) => card.instanceId));

    setSelectedIds((current) => {
      const nextSelectedIds = new Set([...current].filter((instanceId) => visibleIds.has(instanceId)));
      return nextSelectedIds.size === current.size ? current : nextSelectedIds;
    });
  }, [shownCards]);

  useEffect(() => {
    setPeekCount((current) => Math.min(current, Math.max(1, library.length)));
  }, [library.length]);

  const toggleSelected = (instanceId: string) => {
    setSelectedIds((current) => {
      const nextSelectedIds = new Set(current);

      if (nextSelectedIds.has(instanceId)) {
        nextSelectedIds.delete(instanceId);
      } else {
        nextSelectedIds.add(instanceId);
      }

      return nextSelectedIds;
    });
  };

  const moveCard = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= shownCards.length) {
      return;
    }

    const nextCards = [...shownCards];
    [nextCards[index], nextCards[targetIndex]] = [nextCards[targetIndex], nextCards[index]];
    onReorderTopCards(nextCards.map((card) => card.instanceId));
  };

  const handleMoveSelectedToBottom = () => {
    if (selectedIdsInShownOrder.length === 0) {
      return;
    }

    onMoveSelectedToBottom(selectedIdsInShownOrder);
    setSelectedIds(new Set());
  };

  const handleMoveSelectedToGraveyard = () => {
    if (selectedIdsInShownOrder.length === 0) {
      return;
    }

    onMoveSelectedToGraveyard(selectedIdsInShownOrder);
    setSelectedIds(new Set());
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="peek-title" onClick={onClose}>
      <section className="peek-modal" onClick={(event) => event.stopPropagation()}>
        <header className="peek-header">
          <div>
            <h1 id="peek-title">
              <Eye size={18} />
              Peek Library
            </h1>
            <p>
              {playerName} - {library.length} cards in library
            </p>
          </div>
          <button type="button" className="icon-button" aria-label="Close peek" onClick={onClose}>
            <X size={22} />
          </button>
        </header>

        <div className="peek-counts" aria-label="Number of top library cards to reveal">
          {PEEK_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              className={count === peekCount ? "is-active" : ""}
              disabled={count > library.length}
              onClick={() => setPeekCount(count)}
            >
              {count}
            </button>
          ))}
        </div>

        <div className="peek-actions">
          <span>{selectedCount} selected</span>
          <button type="button" disabled={selectedCount === 0} onClick={handleMoveSelectedToBottom}>
            <ListEnd size={15} />
            Bottom
          </button>
          <button type="button" disabled={selectedCount === 0} onClick={handleMoveSelectedToGraveyard}>
            <Skull size={15} />
            Grave
          </button>
        </div>

        {shownCards.length === 0 ? (
          <div className="peek-empty">Library empty</div>
        ) : (
          <div className="peek-card-grid">
            {shownCards.map((card, index) => (
              <article className="peek-card" key={card.instanceId}>
                <span className="peek-position">#{index + 1}</span>
                <CardThumb
                  playerId={playerId}
                  card={card}
                  zone="library"
                  selected={selectedIds.has(card.instanceId)}
                  compact
                  onTap={onInspectCard}
                  onInspect={onInspectCard}
                />
                <strong>{card.name}</strong>
                <div className="peek-card-actions">
                  <button type="button" disabled={index === 0} aria-label={`Move ${card.name} up`} onClick={() => moveCard(index, -1)}>
                    <ArrowUp size={15} />
                  </button>
                  <button type="button" className={selectedIds.has(card.instanceId) ? "is-selected" : ""} onClick={() => toggleSelected(card.instanceId)}>
                    {selectedIds.has(card.instanceId) ? "Selected" : "Select"}
                  </button>
                  <button
                    type="button"
                    disabled={index === shownCards.length - 1}
                    aria-label={`Move ${card.name} down`}
                    onClick={() => moveCard(index, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
