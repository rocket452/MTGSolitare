import type { CardPrintData, MissingLookup, TokenDefinition } from "../types";

const SCRYFALL_NAMED_URL = "https://api.scryfall.com/cards/named?exact=";

type ScryfallImageUris = {
  small?: string;
  normal?: string;
  large?: string;
};

type ScryfallCardFace = {
  type_line?: string;
  oracle_text?: string;
  image_uris?: ScryfallImageUris;
  power?: string;
  toughness?: string;
};

type ScryfallCard = {
  id?: string;
  name?: string;
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
    typeLine,
    oracleText,
    imageUrl: imageUris?.normal ?? imageUris?.large ?? imageUris?.small,
    basePower: powerToughness?.power,
    baseToughness: powerToughness?.toughness,
    tokenSuggestions,
  };
}

async function fetchScryfallCard(cardName: string): Promise<ScryfallCard> {
  const response = await fetch(`${SCRYFALL_NAMED_URL}${encodeURIComponent(cardName)}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Scryfall returned ${response.status}`);
  }

  return (await response.json()) as ScryfallCard;
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

function parseNumericPowerToughness(value?: string): number | undefined {
  if (!value || !/^-?\d+$/.test(value.trim())) {
    return undefined;
  }

  return Number(value);
}
