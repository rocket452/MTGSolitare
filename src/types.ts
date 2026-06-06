export type PlayerId = "A" | "B";

export type ZoneName = "library" | "hand" | "battlefield" | "graveyard" | "exile";

export type CardCounterType = "plusOne" | "generic";
export type PowerToughnessStat = "power" | "toughness";

export type CardInstance = {
  instanceId: string;
  name: string;
  imageUrl?: string;
  typeLine?: string;
  oracleText?: string;
  tapped?: boolean;
  basePower?: number;
  baseToughness?: number;
  displayPower?: number;
  displayToughness?: number;
  plusOneCounters?: number;
  genericCounters?: number;
  counters?: number;
  isToken?: boolean;
  tokenSuggestions?: TokenDefinition[];
};

export type PlayerZones = Record<ZoneName, CardInstance[]>;

export type PlayerState = {
  id: PlayerId;
  name: string;
  life: number;
  energy: number;
  mulligans: number;
  openingHandKept: boolean;
  zones: PlayerZones;
};

export type SelectedCard = {
  playerId: PlayerId;
  zone: ZoneName;
  instanceId: string;
};

export type DragPoint = {
  x: number;
  y: number;
};

export type MissingLookup = {
  typedName: string;
  reason: string;
};

export type GameState = {
  version: 1;
  players: Record<PlayerId, PlayerState>;
  activePlayer: PlayerId;
  selected?: SelectedCard;
  missingCards: MissingLookup[];
  createdAt: string;
  updatedAt: string;
};

export type DeckEntry = {
  name: string;
  count: number;
};

export type CardPrintData = {
  name: string;
  imageUrl?: string;
  typeLine?: string;
  oracleText?: string;
  basePower?: number;
  baseToughness?: number;
  tokenSuggestions?: TokenDefinition[];
};

export type TokenDefinition = {
  id: string;
  name: string;
  typeLine?: string;
  oracleText?: string;
  imageUrl?: string;
  basePower?: number;
  baseToughness?: number;
  sourceName?: string;
};
