import type { CardColor, CardFaceData, CardPrintData, MissingLookup, TokenDefinition } from "../types";

const COLOR_ORDER: CardColor[] = ["W", "U", "B", "R", "G"];
const MAX_LOOKUP_ATTEMPTS = 3;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

type ScryfallImageUris = {
  small?: string;
  normal?: string;
  large?: string;
};

type ScryfallCardFace = {
  name?: string;
  type_line?: string;
  oracle_text?: string;
  image_uris?: ScryfallImageUris;
  power?: string;
  toughness?: string;
};

type ScryfallCard = {
  id?: string;
  name?: string;
  color_identity?: string[];
  type_line?: string;
  oracle_text?: string;
  image_uris?: ScryfallImageUris;
  power?: string;
  toughness?: string;
  card_faces?: ScryfallCardFace[];
  all_parts?: ScryfallRelatedCard[];
};

type ScryfallRelatedCard = {
  id?: string;
  component?: string;
  name?: string;
  type_line?: string;
  uri?: string;
};

export type FetchProgress = {
  done: number;
  total: number;
  currentName?: string;
};

export async function fetchUniqueCards(
  names: string[],
  onProgress?: (progress: FetchProgress) => void,
): Promise<{ cards: Map<string, CardPrintData>; missing: MissingLookup[] }> {
  const uniqueNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const cards = new Map<string, CardPrintData>();
  const missing: MissingLookup[] = [];

  onProgress?.({ done: 0, total: uniqueNames.length });

  for (let index = 0; index < uniqueNames.length; index += 1) {
    const typedName = uniqueNames[index];
    onProgress?.({ done: index, total: uniqueNames.length, currentName: typedName });

    try {
      const card = await fetchCardData(typedName);
      cards.set(typedName.toLowerCase(), card);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Lookup failed";
      missing.push({ typedName, reason });
      cards.set(typedName.toLowerCase(), { name: typedName });
    }

    onProgress?.({ done: index + 1, total: uniqueNames.length, currentName: typedName });
  }

  return { cards, missing };
}

export async function fetchUniqueCardColorIdentities(names: string[]): Promise<Map<string, CardPrintData>> {
  const uniqueNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const cards = new Map<string, CardPrintData>();

  for (const typedName of uniqueNames) {
    try {
      const card = await fetchScryfallCard(typedName);
      cards.set(typedName.toLowerCase(), {
        name: card.name ?? typedName,
        colorIdentity: getColorIdentity(card),
      });
    } catch {
      // Missing color metadata should not block showing the rest of the recent deck list.
    }
  }

  return cards;
}

export async function fetchTokenSuggestionsForCardName(cardName: string): Promise<TokenDefinition[]> {
  try {
    const card = await fetchScryfallCard(cardName);
    return fetchTokenSuggestions(card);
  } catch {
    return [];
  }
}

async function fetchCardData(cardName: string): Promise<CardPrintData> {
  const card = await fetchScryfallCard(cardName);
  const firstFaceWithImage = card.card_faces?.find((face) => face.image_uris);
  const imageUris = card.image_uris ?? firstFaceWithImage?.image_uris;
  const faces = getCardFaces(card);
  const typeLine =
    card.type_line ??
    card.card_faces
      ?.map((face) => face.type_line)
      .filter(Boolean)
      .join(" // ");
  const oracleText =
    card.oracle_text ??
    card.card_faces
      ?.map((face) => face.oracle_text)
      .filter(Boolean)
      .join(" // ");
  const powerToughness = getNumericPowerToughness(card);
  const tokenSuggestions = await fetchTokenSuggestions(card);

  return {
    name: card.name ?? cardName,
    colorIdentity: getColorIdentity(card),
    typeLine,
    oracleText,
    imageUrl: imageUris?.normal ?? imageUris?.large ?? imageUris?.small,
    faces,
    basePower: powerToughness?.power,
    baseToughness: powerToughness?.toughness,
    tokenSuggestions,
  };
}

async function fetchScryfallCard(cardName: string): Promise<ScryfallCard> {
  const exactResponse = await fetchScryfallNamedCard("exact", cardName);

  if (exactResponse.ok) {
    return (await exactResponse.json()) as ScryfallCard;
  }

  if (exactResponse.status !== 404) {
    throw new Error(`Scryfall returned ${exactResponse.status}`);
  }

  const fuzzyResponse = await fetchScryfallNamedCard("fuzzy", cardName);

  if (!fuzzyResponse.ok) {
    throw new Error(`Scryfall returned ${fuzzyResponse.status}`);
  }

  return (await fuzzyResponse.json()) as ScryfallCard;
}

function getCardFaces(card: ScryfallCard): CardFaceData[] | undefined {
  const faces = card.card_faces
    ?.map((face) => {
      const imageUris = face.image_uris;
      const powerToughness = getNumericFacePowerToughness(face);

      return {
        name: face.name ?? card.name ?? "Card face",
        typeLine: face.type_line,
        oracleText: face.oracle_text,
        imageUrl: imageUris?.normal ?? imageUris?.large ?? imageUris?.small,
        basePower: powerToughness?.power,
        baseToughness: powerToughness?.toughness,
      };
    })
    .filter((face) => face.imageUrl || face.typeLine || face.oracleText);

  return faces && faces.length > 1 ? faces : undefined;
}

async function fetchScryfallNamedCard(mode: "exact" | "fuzzy", cardName: string): Promise<Response> {
  const url = `https://api.scryfall.com/cards/named?${mode}=${encodeURIComponent(cardName)}`;
  let lastResponse: Response | undefined;

  for (let attempt = 1; attempt <= MAX_LOOKUP_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok || !RETRYABLE_STATUS_CODES.has(response.status) || attempt === MAX_LOOKUP_ATTEMPTS) {
        return response;
      }

      lastResponse = response;
    } catch (error) {
      if (attempt === MAX_LOOKUP_ATTEMPTS) {
        throw error;
      }
    }

    await wait(250 * attempt);
  }

  return lastResponse ?? fetch(url, { headers: { Accept: "application/json" } });
}

function wait(duration: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function getColorIdentity(card: ScryfallCard): CardColor[] {
  const identity = card.color_identity ?? [];
  return COLOR_ORDER.filter((color) => identity.includes(color));
}

async function fetchTokenSuggestions(card: ScryfallCard): Promise<TokenDefinition[]> {
  const tokenParts = (card.all_parts ?? []).filter((part) => part.component === "token" && part.name);

  if (tokenParts.length === 0) {
    return [];
  }

  const tokenSuggestions = await Promise.all(tokenParts.map((part) => fetchTokenPart(part, card.name)));
  return tokenSuggestions.filter((token): token is TokenDefinition => Boolean(token));
}

async function fetchTokenPart(part: ScryfallRelatedCard, sourceName?: string): Promise<TokenDefinition | undefined> {
  if (!part.name) {
    return undefined;
  }

  try {
    if (!part.uri) {
      return createRelatedTokenDefinition(part, sourceName);
    }

    const response = await fetch(part.uri, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return createRelatedTokenDefinition(part, sourceName);
    }

    const tokenCard = (await response.json()) as ScryfallCard;
    const powerToughness = getNumericPowerToughness(tokenCard);
    const firstFaceWithImage = tokenCard.card_faces?.find((face) => face.image_uris);
    const imageUris = tokenCard.image_uris ?? firstFaceWithImage?.image_uris;
    const typeLine = tokenCard.type_line ?? part.type_line;
    const oracleText =
      tokenCard.oracle_text ??
      tokenCard.card_faces
        ?.map((face) => face.oracle_text)
        .filter(Boolean)
        .join(" // ");

    return {
      id: tokenCard.id ?? part.id ?? `${part.name}:${typeLine ?? "token"}`,
      name: tokenCard.name ?? part.name,
      typeLine,
      oracleText,
      imageUrl: imageUris?.normal ?? imageUris?.large ?? imageUris?.small,
      basePower: powerToughness?.power,
      baseToughness: powerToughness?.toughness,
      sourceName,
    };
  } catch {
    return createRelatedTokenDefinition(part, sourceName);
  }
}

function createRelatedTokenDefinition(part: ScryfallRelatedCard, sourceName?: string): TokenDefinition {
  return {
    id: part.id ?? `${part.name ?? "Token"}:${part.type_line ?? "Token"}`,
    name: part.name ?? "Token",
    typeLine: part.type_line,
    sourceName,
  };
}

function getNumericPowerToughness(card: ScryfallCard): { power: number; toughness: number } | undefined {
  const directPower = parseNumericPowerToughness(card.power);
  const directToughness = parseNumericPowerToughness(card.toughness);

  if (directPower !== undefined && directToughness !== undefined) {
    return { power: directPower, toughness: directToughness };
  }

  for (const face of card.card_faces ?? []) {
    const facePower = parseNumericPowerToughness(face.power);
    const faceToughness = parseNumericPowerToughness(face.toughness);

    if (facePower !== undefined && faceToughness !== undefined) {
      return { power: facePower, toughness: faceToughness };
    }
  }

  return undefined;
}

function getNumericFacePowerToughness(face: ScryfallCardFace): { power: number; toughness: number } | undefined {
  const power = parseNumericPowerToughness(face.power);
  const toughness = parseNumericPowerToughness(face.toughness);

  return power !== undefined && toughness !== undefined ? { power, toughness } : undefined;
}

function parseNumericPowerToughness(value?: string): number | undefined {
  if (!value || !/^-?\d+$/.test(value.trim())) {
    return undefined;
  }

  return Number(value);
}
