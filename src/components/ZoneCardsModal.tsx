import { useEffect } from "react";
import { BadgePlus, Hand, Skull, Swords, X } from "lucide-react";
import type { CardInstance, PlayerId, ZoneName } from "../types";
import { CardThumb } from "./CardThumb";
import { useActionFlash } from "../utils/useActionFlash";

type ZoneCardsModalProps = {
  playerId: PlayerId;
  playerName: string;
  zoneName: Extract<ZoneName, "graveyard" | "exile">;
  cards: CardInstance[];
  onInspectCard: (card: CardInstance) => void;
  onMoveCard: (instanceId: string, destination: ZoneName) => void;
  onClose: () => void;
};

const zoneLabels: Record<Extract<ZoneName, "graveyard" | "exile">, string> = {
  graveyard: "Graveyard",
  exile: "Exile",
};

export function ZoneCardsModal({
  playerId,
  playerName,
  zoneName,
  cards,
  onInspectCard,
  onMoveCard,
  onClose,
}: ZoneCardsModalProps) {
  const title = zoneLabels[zoneName];
  const HeaderIcon = zoneName === "graveyard" ? Skull : BadgePlus;
  const { flashTarget, flashThenRun } = useActionFlash<string>();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby={`${zoneName}-modal-title`} onClick={onClose}>
      <section className="zone-cards-modal" onClick={(event) => event.stopPropagation()}>
        <header className="zone-cards-header">
          <div>
            <h1 id={`${zoneName}-modal-title`}>
              <HeaderIcon size={18} />
              {title}
            </h1>
            <p>
              {playerName} - {cards.length} card{cards.length === 1 ? "" : "s"}
            </p>
          </div>
          <button type="button" className="icon-button" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>
            <X size={22} />
          </button>
        </header>

        {cards.length === 0 ? (
          <div className="zone-cards-empty">{title} empty</div>
        ) : (
          <div className="zone-cards-list">
            {cards.map((card, index) => (
              <article className="zone-cards-card" key={card.instanceId}>
                <span className="zone-cards-position">#{index + 1}</span>
                <CardThumb
                  playerId={playerId}
                  card={card}
                  zone={zoneName}
                  selected={false}
                  compact
                  onTap={onInspectCard}
                  onInspect={onInspectCard}
                />
                <div className="zone-cards-copy">
                  <strong>{card.name}</strong>
                  <small>{card.typeLine ?? "Card"}</small>
                </div>
                <div className="zone-cards-actions">
                  <button
                    type="button"
                    className={flashTarget === `card:${card.instanceId}:hand` ? "is-flashing" : ""}
                    aria-label={`Move ${card.name} to hand`}
                    onClick={() => flashThenRun(`card:${card.instanceId}:hand`, () => onMoveCard(card.instanceId, "hand"))}
                  >
                    <Hand size={14} />
                    Hand
                  </button>
                  <button
                    type="button"
                    className={flashTarget === `card:${card.instanceId}:battlefield` ? "is-flashing" : ""}
                    aria-label={`Move ${card.name} to battlefield`}
                    onClick={() =>
                      flashThenRun(`card:${card.instanceId}:battlefield`, () => onMoveCard(card.instanceId, "battlefield"))
                    }
                  >
                    <Swords size={14} />
                    Field
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
