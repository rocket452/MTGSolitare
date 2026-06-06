import type { CardInstance } from "../types";

type CardWithAlternateTypeFields = CardInstance & {
  cardType?: unknown;
  oracle_text?: unknown;
  type?: unknown;
  type_line?: unknown;
};

export type ManaSymbol = "W" | "U" | "B" | "R" | "G" | "C";

export type LandStackManaSummary = {
  ariaLabel: string;
  label: string;
  parts: Array<{
    key: string;
    symbols: ManaSymbol[];
    text: string;
    count?: number;
    variable?: boolean;
  }>;
};

type ManaProfile =
  | { kind: "fixed"; symbols: ManaSymbol[] }
  | { kind: "choice"; symbols: ManaSymbol[] }
  | { kind: "any" }
  | { kind: "variable"; symbols: ManaSymbol[] };

const basicLandMana: Record<string, ManaSymbol> = {
  plains: "W",
  island: "U",
  swamp: "B",
  mountain: "R",
  forest: "G",
  wastes: "C",
};

const symbolNames: Record<ManaSymbol, string> = {
  W: "white",
  U: "blue",
  B: "black",
  R: "red",
  G: "green",
  C: "colorless",
};

export function isLandCard(card: CardInstance): boolean {
  const candidate = card as CardWithAlternateTypeFields;
  const typeLine = [card.typeLine, candidate.type_line, candidate.type, candidate.cardType].find(
    (value): value is string => typeof value === "string",
  );

  return /\bLand\b/i.test(typeLine ?? "");
}

export function isCreatureCard(card: CardInstance): boolean {
  const candidate = card as CardWithAlternateTypeFields;
  const typeLine = [card.typeLine, candidate.type_line, candidate.type, candidate.cardType].find(
    (value): value is string => typeof value === "string",
  );

  return /\bCreature\b/i.test(getPrimaryTypeLine(typeLine));
}

export function getDisplayedPowerToughness(card: CardInstance): { power: number; toughness: number } | undefined {
  const power = card.displayPower ?? card.basePower;
  const toughness = card.displayToughness ?? card.baseToughness;

  if (power === undefined || toughness === undefined) {
    return undefined;
  }

  const plusOneCounters = card.plusOneCounters ?? 0;

  return {
    power: power + plusOneCounters,
    toughness: toughness + plusOneCounters,
  };
}

export function hasBasePowerToughness(card: CardInstance): boolean {
  return card.basePower !== undefined && card.baseToughness !== undefined;
}

export function getLandStackManaSummary(cards: CardInstance[]): LandStackManaSummary | undefined {
  const profiles = cards.map((card) => getLandManaProfile(card)).filter((profile): profile is ManaProfile => Boolean(profile));

  if (profiles.length === 0) {
    return undefined;
  }

  if (profiles.every((profile) => profile.kind === "fixed")) {
    return summarizeFixedMana(profiles as Array<Extract<ManaProfile, { kind: "fixed" }>>);
  }

  const groupedProfiles = new Map<string, { profile: ManaProfile; count: number }>();

  for (const profile of profiles) {
    const key = getManaProfileKey(profile);
    const existing = groupedProfiles.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      groupedProfiles.set(key, { profile, count: 1 });
    }
  }

  const parts = [...groupedProfiles.values()].map(({ profile, count }) => profileToSummaryPart(profile, count));
  const label = parts.map((part) => part.text).join(" ");

  return {
    label,
    parts,
    ariaLabel: parts.map((part) => getManaPartAriaLabel(part)).join(", "),
  };
}

function getLandManaProfile(card: CardInstance): ManaProfile | undefined {
  const candidate = card as CardWithAlternateTypeFields;
  const oracleText = [card.oracleText, candidate.oracle_text].find((value): value is string => typeof value === "string");
  const oracleProfile = oracleText ? getManaProfileFromOracleText(oracleText) : undefined;

  return oracleProfile ?? getManaProfileFromTypeLine(card);
}

function getManaProfileFromOracleText(oracleText: string): ManaProfile | undefined {
  const addMatch = oracleText.match(/\badd\b([^.\n]+)/i);

  if (!addMatch) {
    return undefined;
  }

  const addText = addMatch[1];

  if (/any (one )?(color|type)/i.test(addText)) {
    return { kind: "any" };
  }

  const symbols = uniqueSymbols([...addText.matchAll(/\{([WUBRGC])\}/gi)].map((match) => match[1].toUpperCase() as ManaSymbol));

  if (symbols.length === 0) {
    return undefined;
  }

  if (/\b(for each|equal to|amount of|that much)\b/i.test(addText)) {
    return { kind: "variable", symbols };
  }

  if (/\bor\b/i.test(addText) && symbols.length > 1) {
    return { kind: "choice", symbols };
  }

  const repeatedSymbols = [...addText.matchAll(/\{([WUBRGC])\}/gi)].map((match) => match[1].toUpperCase() as ManaSymbol);
  return { kind: "fixed", symbols: repeatedSymbols.length > 0 ? repeatedSymbols : symbols };
}

function getManaProfileFromTypeLine(card: CardInstance): ManaProfile | undefined {
  const candidate = card as CardWithAlternateTypeFields;
  const typeLine = [card.typeLine, candidate.type_line, candidate.type, candidate.cardType].find(
    (value): value is string => typeof value === "string",
  );
  const text = `${typeLine ?? ""} ${card.name}`;
  const symbols = uniqueSymbols(
    Object.entries(basicLandMana)
      .filter(([landType]) => new RegExp(`\\b${landType}\\b`, "i").test(text))
      .map(([, symbol]) => symbol),
  );

  if (symbols.length === 0) {
    return undefined;
  }

  return symbols.length === 1 ? { kind: "fixed", symbols } : { kind: "choice", symbols };
}

function summarizeFixedMana(profiles: Array<Extract<ManaProfile, { kind: "fixed" }>>): LandStackManaSummary {
  const counts = new Map<ManaSymbol, number>();

  for (const profile of profiles) {
    for (const symbol of profile.symbols) {
      counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    }
  }

  const parts = [...counts.entries()].map(([symbol, count]) => ({
    key: symbol,
    symbols: [symbol],
    text: count > 1 ? `${symbol} x${count}` : symbol,
    count,
  }));

  return {
    parts,
    label: parts.map((part) => part.text).join(" "),
    ariaLabel: parts.map((part) => getManaPartAriaLabel(part)).join(", "),
  };
}

function profileToSummaryPart(profile: ManaProfile, count: number): LandStackManaSummary["parts"][number] {
  if (profile.kind === "any") {
    return {
      key: "any",
      symbols: [],
      text: count > 1 ? `Any x${count}` : "Any",
      count,
    };
  }

  if (profile.kind === "variable") {
    const symbolText = profile.symbols.length > 0 ? profile.symbols.join("/") : "Mana";
    return {
      key: `variable-${symbolText}`,
      symbols: profile.symbols,
      text: `${symbolText} varies`,
      variable: true,
    };
  }

  const symbolText = profile.symbols.join("/");
  return {
    key: `${profile.kind}-${symbolText}`,
    symbols: profile.symbols,
    text: count > 1 ? `${symbolText} x${count}` : symbolText,
    count,
  };
}

function getManaProfileKey(profile: ManaProfile): string {
  if (profile.kind === "any") {
    return "any";
  }

  return `${profile.kind}-${profile.symbols.join("/")}`;
}

function getManaPartAriaLabel(part: LandStackManaSummary["parts"][number]): string {
  const symbolLabel =
    part.symbols.length > 0 ? part.symbols.map((symbol) => symbolNames[symbol]).join(" or ") : "any color";

  if (part.variable) {
    return `${symbolLabel} mana, variable amount`;
  }

  return part.count && part.count > 1 ? `${part.count} ${symbolLabel} mana` : `${symbolLabel} mana`;
}

function uniqueSymbols(symbols: ManaSymbol[]): ManaSymbol[] {
  return [...new Set(symbols)];
}

function getPrimaryTypeLine(typeLine?: string): string {
  return typeLine?.split("//")[0]?.trim() ?? "";
}
