const ARCHIDEKT_API_BASE = "/archidekt-api";
const EXCLUDED_CATEGORIES = new Set(["maybeboard", "sideboard"]);

type ArchidektDeck = {
  name?: string;
  cards?: ArchidektDeckCard[];
};

type ArchidektDeckCard = {
  categories?: string[];
  companion?: boolean;
  quantity?: number;
  card?: {
    displayName?: string | null;
    name?: string | null;
    oracleCard?: {
      name?: string | null;
    } | null;
  } | null;
};

export type ResolvedDeckInput = {
  decklist: string;
  originalInput: string;
  source: "archidekt" | "text";
  sourceId?: string;
  title?: string;
};

export function getArchidektDeckId(input: string): string | undefined {
  return input.match(/(?:https?:\/\/)?(?:www\.)?archidekt\.com\/decks\/(\d+)(?:\b|\/|\?|#)/i)?.[1];
}

export async function resolveDeckInput(input: string): Promise<string> {
  const resolved = await resolveDeckImportInput(input);
  return resolved.decklist;
}

export async function resolveDeckImportInput(input: string): Promise<ResolvedDeckInput> {
  const originalInput = input.trim();
  const deckId = getArchidektDeckId(input);

  if (!deckId) {
    return {
      decklist: input,
      originalInput,
      source: "text",
      title: inferTextDeckTitle(input),
    };
  }

  const response = await fetch(`${ARCHIDEKT_API_BASE}/decks/${deckId}/`);

  if (!response.ok) {
    throw new Error(`Archidekt returned ${response.status} for deck ${deckId}`);
  }

  const deck = (await response.json()) as ArchidektDeck;
  const lines = (deck.cards ?? [])
    .filter((entry) => !isExcludedEntry(entry))
    .map((entry) => {
      const name = getCardName(entry);
      const quantity = getCardQuantity(entry);

      return name && quantity > 0 ? `${quantity} ${name}` : "";
    })
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error(`Archidekt deck ${deck.name ?? deckId} did not include any importable cards`);
  }

  return {
    decklist: ["Deck", ...lines].join("\n"),
    originalInput,
    source: "archidekt",
    sourceId: deckId,
    title: deck.name,
  };
}

function isExcludedEntry(entry: ArchidektDeckCard): boolean {
  return (entry.categories ?? []).some((category) => EXCLUDED_CATEGORIES.has(category.trim().toLowerCase()));
}

function getCardName(entry: ArchidektDeckCard): string | undefined {
  const name = entry.card?.oracleCard?.name ?? entry.card?.displayName ?? entry.card?.name;
  return typeof name === "string" && name.trim().length > 0 ? name.trim() : undefined;
}

function getCardQuantity(entry: ArchidektDeckCard): number {
  return Number.isFinite(entry.quantity) && entry.quantity ? entry.quantity : 1;
}

function inferTextDeckTitle(input: string): string | undefined {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && line.toLowerCase() !== "deck");
}
