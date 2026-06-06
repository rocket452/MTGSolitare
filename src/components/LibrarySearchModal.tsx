import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, Hand, Layers, Search, Skull, X } from "lucide-react";
import type { CardInstance, PlayerId, ZoneName } from "../types";
import { CardThumb } from "./CardThumb";

type LibrarySearchModalProps = {
  playerId: PlayerId;
  playerName: string;
  library: CardInstance[];
  onInspectCard: (card: CardInstance) => void;
  onMoveCard: (instanceId: string, destination: ZoneName, libraryPosition?: "top" | "bottom") => void;
  onClose: () => void;
};

export function LibrarySearchModal({
  playerId,
  playerName,
  library,
  onInspectCard,
  onMoveCard,
  onClose,
}: LibrarySearchModalProps) {
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return library;
    }

    return library.filter((card) =>
      [card.name, card.typeLine, card.oracleText]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [library, query]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleMoveCard = (card: CardInstance, destination: ZoneName, libraryPosition?: "top" | "bottom") => {
    onMoveCard(card.instanceId, destination, libraryPosition);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="library-search-title" onClick={onClose}>
      <section className="library-search-modal" onClick={(event) => event.stopPropagation()}>
        <header className="library-search-header">
          <div>
            <h1 id="library-search-title">
              <Search size={18} />
              Search Library
            </h1>
            <p>
              {playerName} - {library.length} cards in library
            </p>
          </div>
          <button type="button" className="icon-button" aria-label="Close library search" onClick={onClose}>
            <X size={22} />
          </button>
        </header>

        <label className="library-search-box">
          <Search size={17} />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Card name, type, or rules text"
            spellCheck={false}
          />
        </label>

        <div className="library-search-count" aria-live="polite">
          {filteredCards.length} match{filteredCards.length === 1 ? "" : "es"}
        </div>

        {filteredCards.length === 0 ? (
          <div className="library-search-empty">No cards found</div>
        ) : (
          <div className="library-search-list">
            {filteredCards.map((card) => {
              const libraryIndex = library.findIndex((candidate) => candidate.instanceId === card.instanceId);

              return (
                <article className="library-search-card" key={card.instanceId}>
                  <span className="library-search-position">#{libraryIndex + 1}</span>
                  <CardThumb
                    playerId={playerId}
                    card={card}
                    zone="library"
                    selected={false}
                    compact
                    onTap={onInspectCard}
                    onInspect={onInspectCard}
                  />
                  <div className="library-search-card-copy">
                    <strong>{card.name}</strong>
                    <small>{card.typeLine ?? "Card"}</small>
                  </div>
                  <div className="library-search-card-actions">
                    <button type="button" aria-label={`Move ${card.name} to hand`} onClick={() => handleMoveCard(card, "hand")}>
                      <Hand size={14} />
                      Hand
                    </button>
                    <button
                      type="button"
                      aria-label={`Put ${card.name} on top of library`}
                      disabled={libraryIndex === 0}
                      onClick={() => handleMoveCard(card, "library", "top")}
                    >
                      <Layers size={14} />
                      Top
                    </button>
                    <button
                      type="button"
                      aria-label={`Put ${card.name} on bottom of library`}
                      disabled={libraryIndex === library.length - 1}
                      onClick={() => handleMoveCard(card, "library", "bottom")}
                    >
                      <Archive size={14} />
                      Bottom
                    </button>
                    <button type="button" aria-label={`Move ${card.name} to graveyard`} onClick={() => handleMoveCard(card, "graveyard")}>
                      <Skull size={14} />
                      Grave
                    </button>
                    <button type="button" aria-label={`Exile ${card.name}`} onClick={() => handleMoveCard(card, "exile")}>
                      <X size={14} />
                      Exile
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
