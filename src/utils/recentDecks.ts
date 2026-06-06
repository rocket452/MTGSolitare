import type { DeckEntry } from "../types";
import type { ResolvedDeckInput } from "./archidekt";

const STORAGE_KEY = "mtg-solitaire-recent-decks";
const MAX_RECENT_DECKS = 12;

export type RecentDeck = {
  id: string;
  name: string;
  input: string;
  source: "archidekt" | "text";
  cardCount: number;
  updatedAt: string;
};

export function loadRecentDecks(): RecentDeck[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as RecentDeck[];
    return Array.isArray(parsed) ? parsed.filter(isRecentDeck).slice(0, MAX_RECENT_DECKS) : [];
  } catch {
    return [];
  }
}

export function saveRecentDecks(decks: RecentDeck[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks.slice(0, MAX_RECENT_DECKS)));
}

export function createRecentDeck(resolved: ResolvedDeckInput, entries: DeckEntry[]): RecentDeck {
  const trimmedInput = resolved.originalInput.trim();
  const cardCount = entries.reduce((total, entry) => total + entry.count, 0);
  const fallbackName = entries[0]?.name ?? "Imported deck";

  return {
    id: makeRecentDeckId(resolved, trimmedInput),
    name: resolved.title?.trim() || fallbackName,
    input: trimmedInput || resolved.decklist,
    source: resolved.source,
    cardCount,
    updatedAt: new Date().toISOString(),
  };
}

export function mergeRecentDecks(current: RecentDeck[], additions: RecentDeck[]): RecentDeck[] {
  const seen = new Set<string>();

  return [...additions, ...current]
    .filter((deck) => {
      const key = deck.id || normalizeInput(deck.input);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, MAX_RECENT_DECKS);
}

function makeRecentDeckId(resolved: ResolvedDeckInput, input: string): string {
  if (resolved.source === "archidekt" && resolved.sourceId) {
    return `archidekt:${resolved.sourceId}`;
  }

  return `text:${hashString(normalizeInput(input || resolved.decklist))}`;
}

function normalizeInput(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

function hashString(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}

function isRecentDeck(value: RecentDeck): value is RecentDeck {
  return (
    typeof value?.id === "string" &&
    typeof value.name === "string" &&
    typeof value.input === "string" &&
    (value.source === "archidekt" || value.source === "text") &&
    typeof value.cardCount === "number" &&
    typeof value.updatedAt === "string"
  );
}
