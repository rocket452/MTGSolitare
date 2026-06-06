import type { CardInstance, TokenDefinition } from "../types";

export const COMMON_TOKEN_DEFINITIONS: TokenDefinition[] = [
  {
    id: "common:treasure",
    name: "Treasure",
    typeLine: "Token Artifact — Treasure",
    oracleText: "{T}, Sacrifice this token: Add one mana of any color.",
  },
  {
    id: "common:food",
    name: "Food",
    typeLine: "Token Artifact — Food",
    oracleText: "{2}, {T}, Sacrifice this token: You gain 3 life.",
  },
  {
    id: "common:clue",
    name: "Clue",
    typeLine: "Token Artifact — Clue",
    oracleText: "{2}, Sacrifice this token: Draw a card.",
  },
  {
    id: "common:blood",
    name: "Blood",
    typeLine: "Token Artifact — Blood",
    oracleText: "{1}, {T}, Discard a card, Sacrifice this token: Draw a card.",
  },
  {
    id: "common:powerstone",
    name: "Powerstone",
    typeLine: "Token Artifact — Powerstone",
    oracleText: "{T}: Add {C}. This mana can't be spent to cast a nonartifact spell.",
  },
  {
    id: "common:map",
    name: "Map",
    typeLine: "Token Artifact — Map",
    oracleText: "{1}, {T}, Sacrifice this token: Target creature you control explores. Activate only as a sorcery.",
  },
  {
    id: "common:soldier-1-1",
    name: "Soldier",
    typeLine: "Token Creature — Soldier",
    basePower: 1,
    baseToughness: 1,
  },
  {
    id: "common:spirit-1-1-flying",
    name: "Spirit",
    typeLine: "Token Creature — Spirit",
    oracleText: "Flying",
    basePower: 1,
    baseToughness: 1,
  },
  {
    id: "common:zombie-2-2",
    name: "Zombie",
    typeLine: "Token Creature — Zombie",
    basePower: 2,
    baseToughness: 2,
  },
  {
    id: "common:beast-3-3",
    name: "Beast",
    typeLine: "Token Creature — Beast",
    basePower: 3,
    baseToughness: 3,
  },
];

export function getBattlefieldTokenSuggestions(cards: CardInstance[]): TokenDefinition[] {
  const merged = new Map<string, TokenDefinition>();

  for (const card of cards) {
    for (const token of card.tokenSuggestions ?? []) {
      const key = getTokenKey(token);
      const existing = merged.get(key);

      if (existing) {
        merged.set(key, {
          ...existing,
          sourceName: mergeSourceNames(existing.sourceName, token.sourceName ?? card.name),
        });
      } else {
        merged.set(key, {
          ...token,
          sourceName: token.sourceName ?? card.name,
        });
      }
    }
  }

  return [...merged.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function getTokenKey(token: TokenDefinition): string {
  return token.id || `${token.name.trim().toLowerCase()}:${token.typeLine?.trim().toLowerCase() ?? "token"}`;
}

function mergeSourceNames(existingSource: string | undefined, nextSource: string): string {
  if (!existingSource) {
    return nextSource;
  }

  if (existingSource.split(", ").includes(nextSource)) {
    return existingSource;
  }

  return `${existingSource}, ${nextSource}`;
}
