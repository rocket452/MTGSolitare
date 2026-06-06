import { useMemo, useState } from "react";
import { Check, Clock, Loader2, UserRound, X } from "lucide-react";
import type { RecentDeck } from "../utils/recentDecks";
import type { FetchProgress } from "../utils/scryfall";

type ImportDecksModalProps = {
  isImporting: boolean;
  progress?: FetchProgress | null;
  errorMessage?: string | null;
  recentDecks: RecentDeck[];
  canCancel: boolean;
  onCancel: () => void;
  onImport: (playerADeck: string, playerBDeck: string) => void;
};

const sampleA = `Deck
4 Llanowar Elves
4 Elvish Mystic
4 Reclamation Sage
4 Beast Whisperer
4 Collected Company
4 Forest
4 Overgrown Tomb
4 Blooming Marsh
4 Llanowar Wastes
4 Nykthos, Shrine to Nyx`;

const sampleB = `Deck
4 Monastery Swiftspear
4 Lightning Bolt
4 Play with Fire
4 Kumano Faces Kakkazan
4 Bonecrusher Giant
4 Mountain
4 Sacred Foundry
4 Inspiring Vantage
4 Battlefield Forge
4 Ramunap Ruins`;

export function ImportDecksModal({
  isImporting,
  progress,
  errorMessage,
  recentDecks,
  canCancel,
  onCancel,
  onImport,
}: ImportDecksModalProps) {
  const [playerADeck, setPlayerADeck] = useState("");
  const [playerBDeck, setPlayerBDeck] = useState("");
  const canImport = useMemo(
    () => playerADeck.trim().length > 0 && playerBDeck.trim().length > 0 && !isImporting,
    [playerADeck, playerBDeck, isImporting],
  );

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <form
        className="import-modal"
        onSubmit={(event) => {
          event.preventDefault();
          if (canImport) {
            onImport(playerADeck, playerBDeck);
          }
        }}
      >
        <header className="import-header">
          <div>
            <h1 id="import-title">Import Decks</h1>
            <p>Paste a decklist or Archidekt URL for each side.</p>
          </div>
          {canCancel && (
            <button type="button" className="icon-button" aria-label="Close import" onClick={onCancel}>
              <X size={22} />
            </button>
          )}
        </header>

        <div className="deck-input-grid">
          <label className="deck-input">
            <span>Player B</span>
            <textarea
              value={playerBDeck}
              onChange={(event) => setPlayerBDeck(event.target.value)}
              placeholder="https://archidekt.com/decks/... or 4 Lightning Bolt"
              spellCheck={false}
            />
            <button type="button" className="text-button" onClick={() => setPlayerBDeck(sampleB)}>
              Use sample
            </button>
          </label>

          <label className="deck-input">
            <span>Player A</span>
            <textarea
              value={playerADeck}
              onChange={(event) => setPlayerADeck(event.target.value)}
              placeholder="https://archidekt.com/decks/... or 4 Llanowar Elves"
              spellCheck={false}
            />
            <button type="button" className="text-button" onClick={() => setPlayerADeck(sampleA)}>
              Use sample
            </button>
          </label>
        </div>

        {recentDecks.length > 0 && (
          <section className="recent-decks" aria-labelledby="recent-decks-title">
            <header className="recent-decks-header">
              <h2 id="recent-decks-title">
                <Clock size={16} />
                Recent decks
              </h2>
            </header>
            <div className="recent-deck-list">
              {recentDecks.map((deck) => (
                <article className="recent-deck" key={deck.id}>
                  <div className="recent-deck-copy">
                    <strong>{deck.name}</strong>
                    <small>
                      {deck.source === "archidekt" ? "Archidekt" : "Text"} - {deck.cardCount} cards
                    </small>
                  </div>
                  <div className="recent-deck-actions">
                    <button
                      type="button"
                      className="recent-deck-button"
                      aria-label={`Use ${deck.name} for Player B`}
                      disabled={isImporting}
                      onClick={() => setPlayerBDeck(deck.input)}
                    >
                      <UserRound size={15} />
                      <span>B</span>
                    </button>
                    <button
                      type="button"
                      className="recent-deck-button"
                      aria-label={`Use ${deck.name} for Player A`}
                      disabled={isImporting}
                      onClick={() => setPlayerADeck(deck.input)}
                    >
                      <UserRound size={15} />
                      <span>A</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {progress && (
          <div className="import-progress">
            <Loader2 size={18} className="spin" />
            <span>
              Looking up {progress.done}/{progress.total}
              {progress.currentName ? `: ${progress.currentName}` : ""}
            </span>
          </div>
        )}

        {errorMessage && <div className="import-error">{errorMessage}</div>}

        <footer className="import-footer">
          <button type="submit" className="import-button" disabled={!canImport}>
            {isImporting ? <Loader2 size={18} className="spin" /> : <Check size={18} />}
            Import and Shuffle
          </button>
        </footer>
      </form>
    </div>
  );
}
