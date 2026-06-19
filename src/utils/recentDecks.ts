import type { CardColor, CardPrintData, DeckEntry } from "../types";
import type { ResolvedDeckInput } from "./archidekt";

const STORAGE_KEY = "mtg-solitaire-recent-decks";
const MAX_RECENT_DECKS = 12;
const COLOR_ORDER: CardColor[] = ["W", "U", "B", "R", "G"];
const COLOR_SET = new Set<string>(COLOR_ORDER);

export type RecentDeck = {
  id: string;
  name: string;
  input: string;
  source: "archidekt" | "text";
  colors?: CardColor[];
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

export function createRecentDeck(
  resolved: ResolvedDeckInput,
  entries: DeckEntry[],
  cardLookup?: Map<string, CardPrintData>,
): RecentDeck {
  const trimmedInput = resolved.originalInput.trim();
  const cardCount = entries.reduce((total, entry) => total + entry.count, 0);
  const fallbackName = entries[0]?.name ?? "Imported deck";

  return {
    id: makeRecentDeckId(resolved, trimmedInput),
    name: resolved.title?.trim() || fallbackName,
    input: trimmedInput || resolved.decklist,
    source: resolved.source,
    colors: cardLookup ? getDeckColors(entries, cardLookup) : undefined,
    cardCount,
    updatedAt: new Date().toISOString(),
  };
}

export function getDeckColors(entries: DeckEntry[], cardLookup: Map<string, CardPrintData>): CardColor[] | undefined {
  const colors = new Set<CardColor>();
  let hasColorData = false;

  for (const entry of entries) {
    const colorIdentity = cardLookup.get(entry.name.toLowerCase())?.colorIdentity;

    if (!colorIdentity) {
      continue;
    }

    hasColorData = true;
    for (const color of colorIdentity) {
      if (COLOR_SET.has(color)) {
        colors.add(color);
      }
    }
  }

  return hasColorData ? COLOR_ORDER.filter((color) => colors.has(color)) : undefined;
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
    (value.colors === undefined || isDeckColorArray(value.colors)) &&
    typeof value.cardCount === "number" &&
    typeof value.updatedAt === "string"
  );
}

function isDeckColorArray(value: unknown): value is CardColor[] {
  return Array.isArray(value) && value.every((color) => typeof color === "string" && COLOR_SET.has(color));
}
