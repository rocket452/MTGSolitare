import type { DeckEntry } from "../types";

const SECTION_HEADERS = new Set([
  "deck",
  "main",
  "main deck",
  "mainboard",
  "sideboard",
  "creature",
  "creatures",
  "spell",
  "spells",
  "instant",
  "instants",
  "sorcery",
  "sorceries",
  "artifact",
  "artifacts",
  "enchantment",
  "enchantments",
  "planeswalker",
  "planeswalkers",
  "land",
  "lands",
  "commander",
  "commanders",
]);

export function parseDecklist(input: string): DeckEntry[] {
  const merged = new Map<string, DeckEntry>();

  input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((rawLine) => {
      const line = stripTrailingComment(rawLine.replace(/^SB:\s*/i, ""));
      const headerKey = line.toLowerCase();

      if (!line || SECTION_HEADERS.has(headerKey)) {
        return;
      }

      const match = line.match(/^(\d+)\s*x?\s+(.+)$/i);
      const count = match ? Number.parseInt(match[1], 10) : 1;
      const rawName = match ? match[2] : line;
      const name = normalizeCardName(rawName);

      if (!name || !Number.isFinite(count) || count < 1) {
        return;
      }

      const key = name.toLowerCase();
      const existing = merged.get(key);
      if (existing) {
        existing.count += count;
      } else {
        merged.set(key, { name, count });
      }
    });

  return [...merged.values()];
}

function stripTrailingComment(line: string): string {
  const hashIndex = line.indexOf("#");
  return (hashIndex >= 0 ? line.slice(0, hashIndex) : line).trim();
}

function normalizeCardName(name: string): string {
  return name
    .replace(/\s+\([^)]+\)\s+\d+\S*.*$/i, "")
    .replace(/\s+\[[^\]]+\]\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}
