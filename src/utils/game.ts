import type {
  CardCounterType,
  CardInstance,
  CardPrintData,
  DeckEntry,
  GameMode,
  GameState,
  MissingLookup,
  PlayerId,
  PlayerState,
  PlayerZones,
  PowerToughnessStat,
  SelectedCard,
  TokenDefinition,
  ZoneName,
} from "../types";
import { hasBasePowerToughness, isCreatureCard, isLandCard } from "./cards";
import { shuffle } from "./shuffle";

export const zoneLabels: Record<ZoneName, string> = {
  library: "Library",
  hand: "Hand",
  battlefield: "Battlefield",
  graveyard: "Graveyard",
  exile: "Exile",
};

export function createGameFromDecks(
  playerAEntries: DeckEntry[],
  playerBEntries: DeckEntry[],
  cardLookup: Map<string, CardPrintData>,
  missingCards: MissingLookup[],
  playMode: GameMode = "solitaire",
): GameState {
  const now = new Date().toISOString();

  return {
    version: 1,
    playMode,
    activePlayer: "A",
    missingCards,
    createdAt: now,
    updatedAt: now,
    players: {
      A: createPlayer("A", "Player A", shuffle(buildLibrary(playerAEntries, cardLookup))),
      B: createPlayer("B", "Player B", shuffle(buildLibrary(playerBEntries, cardLookup))),
    },
  };
}

export function selectCard(
  state: GameState,
  playerId: PlayerId,
  zone: ZoneName,
  instanceId: string,
): GameState {
  return touchState({
    ...state,
    selected: { playerId, zone, instanceId },
  });
}

export function clearSelection(state: GameState): GameState {
  if (!state.selected) {
    return state;
  }

  return touchState({
    ...state,
    selected: undefined,
  });
}

export function flipActivePlayer(state: GameState): GameState {
  return touchState({
    ...state,
    activePlayer: state.activePlayer === "A" ? "B" : "A",
    selected: undefined,
  });
}

export function drawCard(state: GameState, playerId: PlayerId): GameState {
  const player = state.players[playerId];

  if (player.zones.library.length === 0) {
    return state;
  }

  const [card, ...library] = player.zones.library;
  const zones = {
    ...player.zones,
    library,
    hand: [...player.zones.hand, card],
  };

  return replacePlayer(state, {
    ...player,
    zones,
  }, {
    playerId,
    zone: "hand",
    instanceId: card.instanceId,
  });
}

export function discardRandomFromHand(state: GameState, playerId: PlayerId, count: number): GameState {
  const player = state.players[playerId];
  const discardCount = Math.min(Math.max(0, Math.floor(count)), player.zones.hand.length);

  if (discardCount === 0) {
    return state;
  }

  const discardIndexes = new Set(shuffle(player.zones.hand.map((_, index) => index)).slice(0, discardCount));
  const hand: CardInstance[] = [];
  const discardedCards: CardInstance[] = [];

  player.zones.hand.forEach((card, index) => {
    if (discardIndexes.has(index)) {
      discardedCards.push(card);
    } else {
      hand.push(card);
    }
  });

  const discardedCardIds = new Set(discardedCards.map((card) => card.instanceId));
  const selected =
    state.selected?.playerId === playerId &&
    state.selected.zone === "hand" &&
    discardedCardIds.has(state.selected.instanceId)
      ? null
      : undefined;

  return replacePlayer(state, {
    ...player,
    zones: {
      ...player.zones,
      hand,
      graveyard: [...player.zones.graveyard, ...discardedCards],
    },
  }, selected);
}

export function shuffleLibrary(state: GameState, playerId: PlayerId): GameState {
  const player = state.players[playerId];

  if (player.zones.library.length < 2) {
    return state;
  }

  return replacePlayer(state, {
    ...player,
    zones: {
      ...player.zones,
      library: shuffle(player.zones.library),
    },
  });
}

export function reorderTopOfLibrary(state: GameState, playerId: PlayerId, orderedInstanceIds: string[]): GameState {
  const player = state.players[playerId];
  const orderedIds = new Set(orderedInstanceIds);

  if (orderedIds.size < 2) {
    return state;
  }

  const cardsById = new Map(player.zones.library.map((card) => [card.instanceId, card]));
  const reorderedTopCards = orderedInstanceIds
    .map((instanceId) => cardsById.get(instanceId))
    .filter((card): card is CardInstance => Boolean(card));

  if (reorderedTopCards.length < 2 || isSameCardOrder(player.zones.library.slice(0, reorderedTopCards.length), reorderedTopCards)) {
    return state;
  }

  return replacePlayer(state, {
    ...player,
    zones: {
      ...player.zones,
      library: [
        ...reorderedTopCards,
        ...player.zones.library.filter((card) => !orderedIds.has(card.instanceId)),
      ],
    },
  }, null);
}

export function moveLibraryCardsToBottom(state: GameState, playerId: PlayerId, instanceIds: string[]): GameState {
  const player = state.players[playerId];
  const selectedIds = new Set(instanceIds);

  if (selectedIds.size === 0) {
    return state;
  }

  const keptCards: CardInstance[] = [];
  const movedCards: CardInstance[] = [];

  player.zones.library.forEach((card) => {
    if (selectedIds.has(card.instanceId)) {
      movedCards.push(card);
    } else {
      keptCards.push(card);
    }
  });

  if (movedCards.length === 0) {
    return state;
  }

  return replacePlayer(state, {
    ...player,
    zones: {
      ...player.zones,
      library: [...keptCards, ...movedCards],
    },
  }, null);
}

export function moveLibraryCardsToGraveyard(state: GameState, playerId: PlayerId, instanceIds: string[]): GameState {
  const player = state.players[playerId];
  const selectedIds = new Set(instanceIds);

  if (selectedIds.size === 0) {
    return state;
  }

  const library: CardInstance[] = [];
  const movedCards: CardInstance[] = [];

  player.zones.library.forEach((card) => {
    if (selectedIds.has(card.instanceId)) {
      movedCards.push(card);
    } else {
      library.push(card);
    }
  });

  if (movedCards.length === 0) {
    return state;
  }

  return replacePlayer(state, {
    ...player,
    zones: {
      ...player.zones,
      library,
      graveyard: [...player.zones.graveyard, ...movedCards],
    },
  }, null);
}

export function mulliganOpeningHand(state: GameState, playerId: PlayerId): GameState {
  const player = state.players[playerId];
  const libraryWithHand = shuffle([...player.zones.hand, ...player.zones.library]);
  const { hand, library } = drawCardsFromLibrary(libraryWithHand, 7);

  return replacePlayer(state, {
    ...player,
    mulligans: player.mulligans + 1,
    openingHandKept: false,
    zones: {
      ...player.zones,
      hand,
      library,
    },
  }, null);
}

export function keepOpeningHand(state: GameState, playerId: PlayerId): GameState {
  const player = state.players[playerId];

  if (player.openingHandKept) {
    return state;
  }

  return replacePlayer(state, {
    ...player,
    openingHandKept: true,
  });
}

export function addGenericToken(state: GameState, playerId: PlayerId): GameState {
  return addTokensToBattlefield(state, playerId, {
    id: "generic-token",
    name: "Generic Token",
    typeLine: "Token",
  });
}

export function addTokensToBattlefield(
  state: GameState,
  playerId: PlayerId,
  tokenDefinition: TokenDefinition,
  quantity = 1,
  tapped = false,
): GameState {
  const player = state.players[playerId];
  const tokenCount = Math.min(99, Math.max(1, Math.trunc(quantity)));
  const tokens = Array.from({ length: tokenCount }, () =>
    initializeDisplayedPowerToughness({
      ...createCardInstance({
        name: tokenDefinition.name,
        typeLine: tokenDefinition.typeLine ?? "Token",
        oracleText: tokenDefinition.oracleText,
        imageUrl: tokenDefinition.imageUrl,
        basePower: tokenDefinition.basePower,
        baseToughness: tokenDefinition.baseToughness,
      }, true),
      tapped,
    }),
  );
  const firstToken = tokens[0];

  return replacePlayer(state, {
    ...player,
    zones: {
      ...player.zones,
      battlefield: [...player.zones.battlefield, ...tokens],
    },
  }, {
    playerId,
    zone: "battlefield",
    instanceId: firstToken.instanceId,
  });
}

export function moveSelectedCard(
  state: GameState,
  destination: ZoneName,
  libraryPosition: "top" | "bottom" = "bottom",
): GameState {
  const selected = state.selected;

  if (!selected) {
    return state;
  }

  return moveCardToZone(state, selected, destination, libraryPosition);
}

export function moveCardToZone(
  state: GameState,
  source: SelectedCard,
  destination: ZoneName,
  libraryPosition: "top" | "bottom" = "bottom",
): GameState {
  if (source.zone === destination && destination !== "library") {
    return state;
  }

  const player = state.players[source.playerId];
  const sourceCards = player.zones[source.zone];
  const sourceIndex = sourceCards.findIndex((candidate) => candidate.instanceId === source.instanceId);

  if (sourceIndex < 0) {
    return state;
  }

  const card = prepareCardForMove(sourceCards[sourceIndex], source.zone, destination);
  const sourceWithoutCard = getSourceCardsAfterMove(source.zone, destination, sourceCards, sourceIndex, card);
  const nextZones: PlayerZones = {
    ...player.zones,
    [source.zone]: sourceWithoutCard,
  };
  const destinationCards = source.zone === destination ? sourceWithoutCard : nextZones[destination];

  nextZones[destination] =
    libraryPosition === "top"
      ? [card, ...destinationCards]
      : [...destinationCards, card];

  const nextSelection =
    destination === "library" || (destination === "battlefield" && isLandCard(card))
      ? null
      : {
          playerId: source.playerId,
          zone: destination,
          instanceId: card.instanceId,
        };

  return replacePlayer(state, {
    ...player,
    zones: nextZones,
  }, nextSelection);
}

export function swapCardPositions(state: GameState, source: SelectedCard, target: SelectedCard): GameState {
  if (source.playerId !== target.playerId || source.instanceId === target.instanceId) {
    return state;
  }

  const player = state.players[source.playerId];
  const sourceCards = player.zones[source.zone];
  const targetCards = player.zones[target.zone];
  const sourceIndex = sourceCards.findIndex((card) => card.instanceId === source.instanceId);
  const targetIndex = targetCards.findIndex((card) => card.instanceId === target.instanceId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return state;
  }

  const sourceCard = sourceCards[sourceIndex];
  const targetCard = targetCards[targetIndex];
  const nextZones: PlayerZones = { ...player.zones };

  if (source.zone === target.zone) {
    const nextCards = [...sourceCards];
    nextCards[sourceIndex] = targetCard;
    nextCards[targetIndex] = sourceCard;
    nextZones[source.zone] = nextCards;
  } else {
    const nextSourceCards = [...sourceCards];
    const nextTargetCards = [...targetCards];
    nextSourceCards[sourceIndex] = targetCard;
    nextTargetCards[targetIndex] = sourceCard;
    nextZones[source.zone] = nextSourceCards;
    nextZones[target.zone] = nextTargetCards;
  }

  return replacePlayer(state, {
    ...player,
    zones: nextZones,
  }, {
    playerId: source.playerId,
    zone: target.zone,
    instanceId: source.instanceId,
  });
}

export function toggleTapped(state: GameState, playerId: PlayerId, instanceId: string): GameState {
  const player = state.players[playerId];
  const battlefield = player.zones.battlefield;
  const hasCard = battlefield.some((card) => card.instanceId === instanceId);

  if (!hasCard) {
    return state;
  }

  return replacePlayer(state, {
    ...player,
    zones: {
      ...player.zones,
      battlefield: battlefield.map((card) =>
        card.instanceId === instanceId ? { ...card, tapped: !card.tapped } : card,
      ),
    },
  });
}

export function adjustCounters(state: GameState, delta: number): GameState {
  const selected = state.selected;

  if (!selected) {
    return state;
  }

  return adjustCardCounters(state, selected.instanceId, "generic", delta);
}

export function adjustCardCounters(
  state: GameState,
  instanceId: string,
  counterType: CardCounterType,
  delta: number,
): GameState {
  const nextDelta = Math.trunc(delta);

  if (nextDelta === 0) {
    return state;
  }

  for (const playerId of Object.keys(state.players) as PlayerId[]) {
    const player = state.players[playerId];

    for (const zone of Object.keys(player.zones) as ZoneName[]) {
      const zoneCards = player.zones[zone];
      const cardIndex = zoneCards.findIndex((card) => card.instanceId === instanceId);

      if (cardIndex < 0) {
        continue;
      }

      const card = zoneCards[cardIndex];
      const currentCounters =
        counterType === "plusOne"
          ? card.plusOneCounters ?? 0
          : card.genericCounters ?? card.counters ?? 0;
      const nextCounters =
        counterType === "plusOne"
          ? currentCounters + nextDelta
          : Math.max(0, currentCounters + nextDelta);

      if (nextCounters === currentCounters) {
        return state;
      }

      const nextCard =
        counterType === "plusOne"
          ? { ...card, plusOneCounters: nextCounters }
          : { ...card, genericCounters: nextCounters, counters: undefined };
      const nextZoneCards = [...zoneCards];
      nextZoneCards[cardIndex] = nextCard;

      return replacePlayer(state, {
        ...player,
        zones: {
          ...player.zones,
          [zone]: nextZoneCards,
        },
      });
    }
  }

  return state;
}

export function findCardByInstanceId(state: GameState, instanceId: string): CardInstance | undefined {
  for (const player of Object.values(state.players)) {
    for (const cards of Object.values(player.zones)) {
      const card = cards.find((candidate) => candidate.instanceId === instanceId);

      if (card) {
        return card;
      }
    }
  }

  return undefined;
}

export function getGenericCounterCount(card: CardInstance): number {
  return card.genericCounters ?? card.counters ?? 0;
}

export function getPlusOneCounterCount(card: CardInstance): number {
  return card.plusOneCounters ?? 0;
}

export function getTotalCounterCount(card: CardInstance): number {
  return getPlusOneCounterCount(card) + getGenericCounterCount(card);
}

export function adjustDisplayedPowerToughness(
  state: GameState,
  instanceId: string,
  stat: PowerToughnessStat,
  delta: number,
): GameState {
  const nextDelta = Math.trunc(delta);

  if (nextDelta === 0) {
    return state;
  }

  return updateCardByInstanceId(state, instanceId, (card) => {
    if (!isCreatureCard(card) && !hasDisplayedPowerToughness(card)) {
      return card;
    }

    const currentPower = getCurrentDisplayPower(card);
    const currentToughness = getCurrentDisplayToughness(card);
    const displayPower = stat === "power" ? currentPower + nextDelta : currentPower;
    const displayToughness = stat === "toughness" ? Math.max(0, currentToughness + nextDelta) : currentToughness;

    if (displayPower === card.displayPower && displayToughness === card.displayToughness) {
      return card;
    }

    return {
      ...card,
      displayPower,
      displayToughness,
    };
  });
}

export function resetDisplayedPowerToughness(state: GameState, instanceId: string): GameState {
  return updateCardByInstanceId(state, instanceId, (card) => {
    if (!hasBasePowerToughness(card)) {
      return card;
    }

    const displayPower = card.basePower;
    const displayToughness = card.baseToughness;

    if (displayPower === card.displayPower && displayToughness === card.displayToughness) {
      return card;
    }

    return {
      ...card,
      displayPower,
      displayToughness,
    };
  });
}

export function changeLife(state: GameState, playerId: PlayerId, delta: number): GameState {
  const player = state.players[playerId];

  return replacePlayer(state, {
    ...player,
    life: player.life + delta,
  });
}

export function changeEnergy(state: GameState, playerId: PlayerId, delta: number): GameState {
  const player = state.players[playerId];
  const energy = Math.max(0, player.energy + delta);

  if (energy === player.energy) {
    return state;
  }

  return replacePlayer(state, {
    ...player,
    energy,
  });
}

export function changePoison(state: GameState, playerId: PlayerId, delta: number): GameState {
  const player = state.players[playerId];
  const poison = Math.max(0, player.poison + delta);

  if (poison === player.poison) {
    return state;
  }

  return replacePlayer(state, {
    ...player,
    poison,
  });
}

export function findSelectedCard(state: GameState): CardInstance | undefined {
  const selected = state.selected;

  if (!selected) {
    return undefined;
  }

  return state.players[selected.playerId].zones[selected.zone].find(
    (card) => card.instanceId === selected.instanceId,
  );
}

function createPlayer(id: PlayerId, name: string, library: CardInstance[]): PlayerState {
  const openingDraw = drawCardsFromLibrary(library, 7);

  return {
    id,
    name,
    life: 20,
    energy: 0,
    poison: 0,
    mulligans: 0,
    openingHandKept: false,
    zones: {
      library: openingDraw.library,
      hand: openingDraw.hand,
      battlefield: [],
      graveyard: [],
      exile: [],
    },
  };
}

function drawCardsFromLibrary(library: CardInstance[], count: number): Pick<PlayerZones, "hand" | "library"> {
  return {
    hand: library.slice(0, count),
    library: library.slice(count),
  };
}

function buildLibrary(entries: DeckEntry[], cardLookup: Map<string, CardPrintData>): CardInstance[] {
  return entries.flatMap((entry) => {
    const card = cardLookup.get(entry.name.toLowerCase()) ?? { name: entry.name };
    return Array.from({ length: entry.count }, () => createCardInstance(card));
  });
}

function createCardInstance(card: CardPrintData, isToken = false): CardInstance {
  return {
    instanceId: createId(),
    name: card.name,
    imageUrl: card.imageUrl,
    typeLine: card.typeLine,
    oracleText: card.oracleText,
    basePower: card.basePower,
    baseToughness: card.baseToughness,
    tapped: false,
    plusOneCounters: 0,
    genericCounters: 0,
    isToken,
    tokenSuggestions: card.tokenSuggestions,
  };
}

function getSourceCardsAfterMove(
  sourceZone: ZoneName,
  destination: ZoneName,
  sourceCards: CardInstance[],
  sourceIndex: number,
  movedCard: CardInstance,
): CardInstance[] {
  const sourceWithoutCard = sourceCards.filter((candidate) => candidate.instanceId !== movedCard.instanceId);

  if (sourceZone !== "hand" || destination === "hand") {
    return sourceWithoutCard;
  }

  return preserveHandStackPosition(sourceWithoutCard, sourceIndex, movedCard);
}

function preserveHandStackPosition(cards: CardInstance[], sourceIndex: number, movedCard: CardInstance): CardInstance[] {
  const stackKey = getStackKey(movedCard);
  const replacementIndex = cards.findIndex((card) => getStackKey(card) === stackKey);

  if (replacementIndex < 0 || replacementIndex <= sourceIndex) {
    return cards;
  }

  const nextCards = [...cards];
  const [replacementCard] = nextCards.splice(replacementIndex, 1);
  nextCards.splice(Math.min(sourceIndex, nextCards.length), 0, replacementCard);

  return nextCards;
}

function isSameCardOrder(leftCards: CardInstance[], rightCards: CardInstance[]): boolean {
  return leftCards.length === rightCards.length && leftCards.every((card, index) => card.instanceId === rightCards[index]?.instanceId);
}

function getStackKey(card: CardInstance): string {
  return card.name.trim().toLowerCase();
}

function prepareCardForMove(card: CardInstance, source: ZoneName, destination: ZoneName): CardInstance {
  if (destination === "battlefield") {
    return initializeDisplayedPowerToughness(card);
  }

  if (source === "battlefield") {
    return clearDisplayedPowerToughness(card);
  }

  return card;
}

function initializeDisplayedPowerToughness(card: CardInstance): CardInstance {
  if (!isCreatureCard(card) || !hasBasePowerToughness(card)) {
    return card;
  }

  return {
    ...card,
    displayPower: card.basePower,
    displayToughness: card.baseToughness,
  };
}

function clearDisplayedPowerToughness(card: CardInstance): CardInstance {
  if (card.displayPower === undefined && card.displayToughness === undefined) {
    return card;
  }

  return {
    ...card,
    displayPower: undefined,
    displayToughness: undefined,
  };
}

function hasDisplayedPowerToughness(card: CardInstance): boolean {
  return card.displayPower !== undefined && card.displayToughness !== undefined;
}

function getCurrentDisplayPower(card: CardInstance): number {
  return card.displayPower ?? card.basePower ?? 0;
}

function getCurrentDisplayToughness(card: CardInstance): number {
  return card.displayToughness ?? card.baseToughness ?? 0;
}

function updateCardByInstanceId(
  state: GameState,
  instanceId: string,
  updater: (card: CardInstance) => CardInstance,
): GameState {
  for (const playerId of Object.keys(state.players) as PlayerId[]) {
    const player = state.players[playerId];

    for (const zone of Object.keys(player.zones) as ZoneName[]) {
      const zoneCards = player.zones[zone];
      const cardIndex = zoneCards.findIndex((card) => card.instanceId === instanceId);

      if (cardIndex < 0) {
        continue;
      }

      const card = zoneCards[cardIndex];
      const nextCard = updater(card);

      if (nextCard === card) {
        return state;
      }

      const nextZoneCards = [...zoneCards];
      nextZoneCards[cardIndex] = nextCard;

      return replacePlayer(state, {
        ...player,
        zones: {
          ...player.zones,
          [zone]: nextZoneCards,
        },
      });
    }
  }

  return state;
}

function replacePlayer(state: GameState, player: PlayerState, selected?: SelectedCard | null): GameState {
  return touchState({
    ...state,
    players: {
      ...state.players,
      [player.id]: player,
    },
    selected: selected === undefined ? state.selected : selected ?? undefined,
  });
}

function touchState(state: GameState): GameState {
  return {
    ...state,
    updatedAt: new Date().toISOString(),
  };
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `card-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
