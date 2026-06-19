import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import { CardLightbox } from "./components/CardLightbox";
import { ImportDecksModal } from "./components/ImportDecksModal";
import { MobileAdSlot, shouldShowMobileAdSlot } from "./components/MobileAdSlot";
import { OpeningHandsScreen } from "./components/OpeningHandsScreen";
import { PlayerPanel } from "./components/PlayerPanel";
import { TurnBar } from "./components/TurnBar";
import type {
  CardColor,
  CardCounterType,
  CardInstance,
  CardPrintData,
  GameMode,
  GameState,
  PlayerId,
  PlayerZones,
  ZoneName,
} from "./types";
import { resolveDeckImportInput } from "./utils/archidekt";
import { isCreatureCard } from "./utils/cards";
import { parseDecklist } from "./utils/deckParser";
import {
  adjustCardCounters,
  addTokensToBattlefield,
  changeEnergy,
  changeLife,
  changePoison,
  createGameFromDecks,
  discardRandomFromHand,
  drawCard,
  findCardByInstanceId,
  findSelectedCard,
  flipActivePlayer,
  keepOpeningHand,
  moveCardToZone,
  moveLibraryCardsToBottom,
  moveLibraryCardsToGraveyard,
  mulliganOpeningHand,
  reorderTopOfLibrary,
  selectCard,
  shuffleLibrary,
  swapCardPositions,
  toggleTapped,
} from "./utils/game";
import {
  createRecentDeck,
  getDeckColors,
  loadRecentDecks,
  mergeRecentDecks,
  saveRecentDecks,
  type RecentDeck,
} from "./utils/recentDecks";
import { fetchUniqueCardColorIdentities, fetchUniqueCards, type FetchProgress } from "./utils/scryfall";

const STORAGE_KEY = "mtg-solitaire-game-state";
const STACK_LANDS_STORAGE_KEY = "mtg-solitaire-stack-lands";
const MAX_UNDO = 60;
const ZONE_NAMES: ZoneName[] = ["library", "hand", "battlefield", "graveyard", "exile"];

type CardDragState = {
  source: {
    playerId: PlayerId;
    zone: ZoneName;
    instanceId: string;
  };
  card: CardInstance;
  point: {
    x: number;
    y: number;
  };
  targetPlayerId?: PlayerId;
  targetZone?: ZoneName;
  targetCard?: {
    playerId: PlayerId;
    zone: ZoneName;
    instanceId: string;
  };
};

type HandoffState = {
  playerId: PlayerId;
  context: "opening" | "turn";
};

export default function App() {
  const [game, setGame] = useState<GameState | null>(() => loadSavedGame());
  const [undoStack, setUndoStack] = useState<GameState[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(() => game === null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<FetchProgress | null>(null);
  const [recentDecks, setRecentDecks] = useState(() => loadRecentDecks());
  const [inspectedCard, setInspectedCard] = useState<CardInstance | null>(null);
  const [cardDrag, setCardDrag] = useState<CardDragState | null>(null);
  const [handoff, setHandoff] = useState<HandoffState | null>(null);
  const [stackLands, setStackLands] = useState(() => loadStoredBoolean(STACK_LANDS_STORAGE_KEY, true));
  const cardDragRef = useRef<CardDragState | null>(null);
  const repairCardNamesRef = useRef(new Set<string>());

  useEffect(() => {
    if (game) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    }
  }, [game]);

  useEffect(() => {
    if (!game) {
      return;
    }

    const missingImportNames = getMissingImportDataNames(game).filter(
      (name) => !repairCardNamesRef.current.has(name.toLowerCase()),
    );

    if (missingImportNames.length === 0) {
      return;
    }

    for (const name of missingImportNames) {
      repairCardNamesRef.current.add(name.toLowerCase());
    }

    let isCancelled = false;

    fetchUniqueCards(missingImportNames)
      .then(({ cards, missing }) => {
        if (isCancelled) {
          return;
        }

        const unresolvedNames = new Set(missing.map((entry) => entry.typedName.toLowerCase()));
        const resolvedCards = new Map(
          [...cards.entries()].filter(
            ([key, card]) => !unresolvedNames.has(key) && (card.imageUrl || card.typeLine || card.oracleText),
          ),
        );

        if (resolvedCards.size === 0) {
          return;
        }

        setGame((current) => (current ? repairMissingCardImports(current, resolvedCards) : current));
      })
      .catch(() => {
        for (const name of missingImportNames) {
          repairCardNamesRef.current.delete(name.toLowerCase());
        }
      });

    return () => {
      isCancelled = true;
      for (const name of missingImportNames) {
        repairCardNamesRef.current.delete(name.toLowerCase());
      }
    };
  }, [game]);

  useEffect(() => {
    localStorage.setItem(STACK_LANDS_STORAGE_KEY, String(stackLands));
  }, [stackLands]);

  useEffect(() => {
    if (!isImportOpen || isImporting) {
      return;
    }

    const decksNeedingColors = recentDecks.filter((deck) => deck.colors === undefined);

    if (decksNeedingColors.length === 0) {
      return;
    }

    let isCancelled = false;

    Promise.all(
      decksNeedingColors.map(async (deck) => {
        try {
          return await resolveRecentDeckColorUpdate(deck);
        } catch {
          return undefined;
        }
      }),
    ).then((updates) => {
      if (isCancelled) {
        return;
      }

      const colorUpdates = new Map<string, CardColor[]>();

      for (const update of updates) {
        if (update) {
          colorUpdates.set(update.id, update.colors);
        }
      }

      if (colorUpdates.size === 0) {
        return;
      }

      setRecentDecks((current) => {
        let changed = false;
        const next = current.map((deck) => {
          if (deck.colors !== undefined || !colorUpdates.has(deck.id)) {
            return deck;
          }

          changed = true;
          return { ...deck, colors: colorUpdates.get(deck.id) ?? [] };
        });

        if (changed) {
          saveRecentDecks(next);
        }

        return changed ? next : current;
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [isImportOpen, isImporting, recentDecks]);

  useEffect(() => {
    const suppressCardContextMenu = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;

      if (target?.closest("[data-card-id], .land-stack-summary, .drag-preview, .lightbox-card")) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", suppressCardContextMenu, true);
    return () => document.removeEventListener("contextmenu", suppressCardContextMenu, true);
  }, []);

  const selectedCard = useMemo(() => (game ? findSelectedCard(game) : undefined), [game]);
  const currentInspectedCard = useMemo(() => {
    if (!game || !inspectedCard) {
      return inspectedCard;
    }

    return findCardByInstanceId(game, inspectedCard.instanceId) ?? inspectedCard;
  }, [game, inspectedCard]);
  const commitGameUpdate = useCallback((updater: (current: GameState) => GameState, undoable = true) => {
    setGame((current) => {
      if (!current) {
        return current;
      }

      const next = updater(current);
      if (next === current) {
        return current;
      }

      if (undoable) {
        setUndoStack((stack) => [...stack.slice(Math.max(0, stack.length - MAX_UNDO + 1)), current]);
      }

      return next;
    });
  }, []);

  const handleImport = useCallback(async (playerADeck: string, playerBDeck: string, playMode: GameMode) => {
    setIsImporting(true);
    setImportError(null);
    setImportProgress({ done: 0, total: 0, currentName: "Loading deck inputs" });

    try {
      const [resolvedPlayerADeck, resolvedPlayerBDeck] = await Promise.all([
        resolveDeckImportInput(playerADeck),
        resolveDeckImportInput(playerBDeck),
      ]);
      setImportProgress({ done: 0, total: 0, currentName: "Parsing decklists" });

      const playerAEntries = parseDecklist(resolvedPlayerADeck.decklist);
      const playerBEntries = parseDecklist(resolvedPlayerBDeck.decklist);
      const uniqueNames = [...playerAEntries, ...playerBEntries].map((entry) => entry.name);
      const { cards, missing } = await fetchUniqueCards(uniqueNames, setImportProgress);
      const nextGame = createGameFromDecks(playerAEntries, playerBEntries, cards, missing, playMode);
      const importedRecentDecks = [
        createRecentDeck(resolvedPlayerBDeck, playerBEntries, cards),
        createRecentDeck(resolvedPlayerADeck, playerAEntries, cards),
      ];

      setGame(nextGame);
      setUndoStack([]);
      setInspectedCard(null);
      setCardDrag(null);
      setHandoff(playMode === "passAndPlay" ? { playerId: "A", context: "opening" } : null);
      setRecentDecks((current) => {
        const nextRecentDecks = mergeRecentDecks(current, importedRecentDecks);
        saveRecentDecks(nextRecentDecks);
        return nextRecentDecks;
      });
      setIsImportOpen(false);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Deck import failed");
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((stack) => {
      const previous = stack[stack.length - 1];
      if (!previous) {
        return stack;
      }

      setGame(previous);
      return stack.slice(0, -1);
    });
  }, []);

  const handleClearGame = useCallback(() => {
    const confirmed = window.confirm("Clear the current game and return to deck import?");
    if (!confirmed) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    setGame(null);
    setUndoStack([]);
    setIsImportOpen(true);
    setInspectedCard(null);
    setCardDrag(null);
    cardDragRef.current = null;
    setHandoff(null);
  }, []);

  const handleCardTap = useCallback((playerId: PlayerId, zone: ZoneName, card: CardInstance) => {
    if (zone === "battlefield") {
      commitGameUpdate((current) => toggleTapped(selectCard(current, playerId, zone, card.instanceId), playerId, card.instanceId));
      return;
    }

    commitGameUpdate((current) => selectCard(current, playerId, zone, card.instanceId), false);
  }, [commitGameUpdate]);

  const handleAdjustInspectedCounter = useCallback((counterType: CardCounterType, delta: number) => {
    if (!inspectedCard) {
      return;
    }

    commitGameUpdate((current) => adjustCardCounters(current, inspectedCard.instanceId, counterType, delta));
  }, [commitGameUpdate, inspectedCard]);

  const detectZoneDropTarget = useCallback((x: number, y: number, sourcePlayerId: PlayerId) => {
    const element = document.elementFromPoint(x, y);
    const dropZone = element?.closest<HTMLElement>("[data-drop-zone][data-player-id]");

    if (!dropZone) {
      return undefined;
    }

    const playerId = dropZone.dataset.playerId as PlayerId | undefined;
    const zone = dropZone.dataset.dropZone as ZoneName | undefined;
    const isValidDropZone =
      zone === "battlefield" || zone === "hand" || zone === "library" || zone === "graveyard" || zone === "exile";

    if (playerId !== sourcePlayerId || !zone || !isValidDropZone) {
      return undefined;
    }

    return { playerId, zone };
  }, []);

  const detectCardSwapTarget = useCallback((x: number, y: number, source: CardDragState["source"]) => {
    const element = document.elementFromPoint(x, y);
    const cardElement = element?.closest<HTMLElement>("[data-card-id][data-card-zone][data-player-id]");

    if (!cardElement) {
      return undefined;
    }

    const playerId = cardElement.dataset.playerId as PlayerId | undefined;
    const zone = cardElement.dataset.cardZone as ZoneName | undefined;
    const instanceId = cardElement.dataset.cardId;
    const canSwapZone = zone === "hand" || zone === "battlefield";
    const canSourceSwap = source.zone === "hand" || source.zone === "battlefield";
    const isBattlefieldToHandMove = source.zone === "battlefield" && zone === "hand";

    if (
      !playerId ||
      !zone ||
      !instanceId ||
      playerId !== source.playerId ||
      instanceId === source.instanceId ||
      isBattlefieldToHandMove ||
      !canSwapZone ||
      !canSourceSwap
    ) {
      return undefined;
    }

    return { playerId, zone, instanceId };
  }, []);

  const handleCardDragStart = useCallback((playerId: PlayerId, zone: ZoneName, card: CardInstance, point: { x: number; y: number }) => {
    const source = { playerId, zone, instanceId: card.instanceId };
    const targetZone = detectZoneDropTarget(point.x, point.y, playerId);
    const targetCard = detectCardSwapTarget(point.x, point.y, source);
    const nextDrag = {
      source,
      card,
      point,
      targetPlayerId: targetZone?.playerId,
      targetZone: targetZone?.zone,
      targetCard,
    };

    commitGameUpdate((current) => selectCard(current, playerId, zone, card.instanceId), false);
    cardDragRef.current = nextDrag;
    setCardDrag(nextDrag);
  }, [commitGameUpdate, detectCardSwapTarget, detectZoneDropTarget]);

  const handleCardDragMove = useCallback((point: { x: number; y: number }) => {
    setCardDrag((current) => {
      const activeDrag = cardDragRef.current ?? current;

      if (!activeDrag) {
        return current;
      }

      const targetZone = detectZoneDropTarget(point.x, point.y, activeDrag.source.playerId);
      const nextDrag = {
        ...activeDrag,
        point,
        targetPlayerId: targetZone?.playerId,
        targetZone: targetZone?.zone,
        targetCard: detectCardSwapTarget(point.x, point.y, activeDrag.source),
      };

      cardDragRef.current = nextDrag;
      return nextDrag;
    });
  }, [detectCardSwapTarget, detectZoneDropTarget]);

  const handleCardDragEnd = useCallback((point: { x: number; y: number }) => {
    const activeDrag = cardDragRef.current;

    if (!activeDrag) {
      setCardDrag(null);
      return;
    }

    const targetCard = detectCardSwapTarget(point.x, point.y, activeDrag.source);
    const targetZone = detectZoneDropTarget(point.x, point.y, activeDrag.source.playerId);

    if (activeDrag.source.zone === "battlefield" && targetZone?.zone === "hand") {
      commitGameUpdate((gameState) => moveCardToZone(gameState, activeDrag.source, "hand", "top"));
    } else if (targetCard) {
      commitGameUpdate((gameState) => swapCardPositions(gameState, activeDrag.source, targetCard));
    } else if (targetZone) {
      commitGameUpdate((gameState) =>
        moveCardToZone(
          gameState,
          activeDrag.source,
          targetZone.zone,
          targetZone.zone === "battlefield" ? "bottom" : "top",
        ),
      );
    }

    cardDragRef.current = null;
    setCardDrag(null);
  }, [commitGameUpdate, detectCardSwapTarget, detectZoneDropTarget]);

  const handleKeepOpeningHand = useCallback((playerId: PlayerId) => {
    if (!game) {
      return;
    }

    const nextOpeningPlayer = getNextOpeningPlayerAfterKeep(game, playerId);
    commitGameUpdate((current) => keepOpeningHand(current, playerId));

    if (game.playMode === "passAndPlay") {
      setInspectedCard(null);
      setCardDrag(null);
      cardDragRef.current = null;
      setHandoff({
        playerId: nextOpeningPlayer ?? game.activePlayer,
        context: nextOpeningPlayer ? "opening" : "turn",
      });
    }
  }, [commitGameUpdate, game]);

  const handleTurnChange = useCallback(() => {
    if (!game) {
      return;
    }

    setInspectedCard(null);
    setCardDrag(null);
    cardDragRef.current = null;

    if (game.playMode === "passAndPlay") {
      setHandoff({ playerId: getNextPlayer(game.activePlayer), context: "turn" });
      return;
    }

    commitGameUpdate(flipActivePlayer);
  }, [commitGameUpdate, game]);

  const handleStartHandoff = useCallback(() => {
    if (!handoff) {
      return;
    }

    const nextHandoff = handoff;
    setInspectedCard(null);
    setCardDrag(null);
    cardDragRef.current = null;
    setHandoff(null);

    if (nextHandoff.context === "turn") {
      commitGameUpdate((current) =>
        current.activePlayer === nextHandoff.playerId ? current : flipActivePlayer(current),
      );
    }
  }, [commitGameUpdate, handoff]);

  if (!game) {
    return (
      <ImportDecksModal
        isImporting={isImporting}
        progress={importProgress}
        errorMessage={importError}
        recentDecks={recentDecks}
        canCancel={false}
        onCancel={() => undefined}
        onImport={handleImport}
      />
    );
  }

  const nextPlayer = game.activePlayer === "A" ? "B" : "A";
  const isChoosingOpeningHands = !game.players.A.openingHandKept || !game.players.B.openingHandKept;
  const appShellClassName = [
    "app-shell",
    shouldShowMobileAdSlot && !isChoosingOpeningHands ? "has-mobile-ad" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={appShellClassName}>
      {isChoosingOpeningHands ? (
        <OpeningHandsScreen
          players={[game.players.A, game.players.B]}
          onInspectCard={setInspectedCard}
          onMulligan={(playerId) => commitGameUpdate((current) => mulliganOpeningHand(current, playerId))}
          onKeepOpeningHand={handleKeepOpeningHand}
        />
      ) : (
        <>
          <MobileAdSlot />

          <main className={`play-screen active-${game.activePlayer.toLowerCase()}`}>
            <PlayerPanel
              player={game.players.B}
              isActive={game.activePlayer === "B"}
              stackLands={stackLands}
              selected={game.selected}
              swapTarget={cardDrag?.targetCard}
              dragTargetPlayerId={cardDrag?.targetPlayerId}
              dragTargetZone={cardDrag?.targetZone}
              dragSourcePlayerId={cardDrag?.source.playerId}
              isDraggingCard={Boolean(cardDrag)}
              onCardTap={handleCardTap}
              onInspectCard={setInspectedCard}
              onCardDragStart={handleCardDragStart}
              onCardDragMove={handleCardDragMove}
              onCardDragEnd={handleCardDragEnd}
              onLifeChange={(playerId, delta) => commitGameUpdate((current) => changeLife(current, playerId, delta))}
              onEnergyChange={(playerId, delta) => commitGameUpdate((current) => changeEnergy(current, playerId, delta))}
              onPoisonChange={(playerId, delta) => commitGameUpdate((current) => changePoison(current, playerId, delta))}
              undoDisabled={undoStack.length === 0}
              onUndo={handleUndo}
              onShuffle={(playerId) => commitGameUpdate((current) => shuffleLibrary(current, playerId))}
              onCreateToken={(playerId, token, quantity, tapped) =>
                commitGameUpdate((current) => addTokensToBattlefield(current, playerId, token, quantity, tapped))
              }
              onDiscardRandom={(playerId, count) => commitGameUpdate((current) => discardRandomFromHand(current, playerId, count))}
              onReorderTopLibrary={(playerId, orderedInstanceIds) => commitGameUpdate((current) => reorderTopOfLibrary(current, playerId, orderedInstanceIds))}
              onMoveLibraryCardsToBottom={(playerId, instanceIds) => commitGameUpdate((current) => moveLibraryCardsToBottom(current, playerId, instanceIds))}
              onMoveLibraryCardsToGraveyard={(playerId, instanceIds) => commitGameUpdate((current) => moveLibraryCardsToGraveyard(current, playerId, instanceIds))}
              onMoveLibraryCard={(playerId, instanceId, destination, libraryPosition) =>
                commitGameUpdate((current) => moveCardToZone(current, { playerId, zone: "library", instanceId }, destination, libraryPosition))
              }
              onMulligan={(playerId) => commitGameUpdate((current) => mulliganOpeningHand(current, playerId))}
              onKeepOpeningHand={handleKeepOpeningHand}
              onStackLandsChange={setStackLands}
              onNewGame={handleClearGame}
            />

            <PlayerPanel
              player={game.players.A}
              isActive={game.activePlayer === "A"}
              stackLands={stackLands}
              selected={game.selected}
              swapTarget={cardDrag?.targetCard}
              dragTargetPlayerId={cardDrag?.targetPlayerId}
              dragTargetZone={cardDrag?.targetZone}
              dragSourcePlayerId={cardDrag?.source.playerId}
              isDraggingCard={Boolean(cardDrag)}
              onCardTap={handleCardTap}
              onInspectCard={setInspectedCard}
              onCardDragStart={handleCardDragStart}
              onCardDragMove={handleCardDragMove}
              onCardDragEnd={handleCardDragEnd}
              onLifeChange={(playerId, delta) => commitGameUpdate((current) => changeLife(current, playerId, delta))}
              onEnergyChange={(playerId, delta) => commitGameUpdate((current) => changeEnergy(current, playerId, delta))}
              onPoisonChange={(playerId, delta) => commitGameUpdate((current) => changePoison(current, playerId, delta))}
              undoDisabled={undoStack.length === 0}
              onUndo={handleUndo}
              onShuffle={(playerId) => commitGameUpdate((current) => shuffleLibrary(current, playerId))}
              onCreateToken={(playerId, token, quantity, tapped) =>
                commitGameUpdate((current) => addTokensToBattlefield(current, playerId, token, quantity, tapped))
              }
              onDiscardRandom={(playerId, count) => commitGameUpdate((current) => discardRandomFromHand(current, playerId, count))}
              onReorderTopLibrary={(playerId, orderedInstanceIds) => commitGameUpdate((current) => reorderTopOfLibrary(current, playerId, orderedInstanceIds))}
              onMoveLibraryCardsToBottom={(playerId, instanceIds) => commitGameUpdate((current) => moveLibraryCardsToBottom(current, playerId, instanceIds))}
              onMoveLibraryCardsToGraveyard={(playerId, instanceIds) => commitGameUpdate((current) => moveLibraryCardsToGraveyard(current, playerId, instanceIds))}
              onMoveLibraryCard={(playerId, instanceId, destination, libraryPosition) =>
                commitGameUpdate((current) => moveCardToZone(current, { playerId, zone: "library", instanceId }, destination, libraryPosition))
              }
              onMulligan={(playerId) => commitGameUpdate((current) => mulliganOpeningHand(current, playerId))}
              onKeepOpeningHand={handleKeepOpeningHand}
              onStackLandsChange={setStackLands}
              onNewGame={handleClearGame}
            />
          </main>

          <TurnBar
            activePlayer={game.activePlayer}
            nextPlayer={nextPlayer}
            isPassAndPlay={game.playMode === "passAndPlay"}
            missingCards={game.missingCards}
            onDraw={() => commitGameUpdate((current) => drawCard(current, game.activePlayer))}
            onFlipTurn={handleTurnChange}
          />
        </>
      )}

      {isImportOpen && (
        <ImportDecksModal
          isImporting={isImporting}
          progress={importProgress}
          errorMessage={importError}
          recentDecks={recentDecks}
          canCancel
          onCancel={() => setIsImportOpen(false)}
          onImport={handleImport}
        />
      )}

      {currentInspectedCard && (
        <CardLightbox
          card={currentInspectedCard}
          onClose={() => setInspectedCard(null)}
          onAdjustCounter={handleAdjustInspectedCounter}
        />
      )}

      {handoff && game.playMode === "passAndPlay" && (
        <PassAndPlayGate handoff={handoff} onStart={handleStartHandoff} />
      )}

      {cardDrag && (
        <div
          className="drag-preview"
          style={{
            transform: `translate3d(${cardDrag.point.x}px, ${cardDrag.point.y}px, 0)`,
          }}
          aria-hidden="true"
        >
          {cardDrag.card.imageUrl ? (
            <img src={cardDrag.card.imageUrl} alt="" draggable={false} />
          ) : (
            <span>{cardDrag.card.name}</span>
          )}
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {selectedCard ? `Selected ${selectedCard.name}` : "No selected card"}
      </div>
    </div>
  );
}

function PassAndPlayGate({ handoff, onStart }: { handoff: HandoffState; onStart: () => void }) {
  const actionLabel = handoff.context === "opening" ? `Show Player ${handoff.playerId} hand` : `Start Player ${handoff.playerId} turn`;

  return (
    <div className="pass-gate-backdrop" role="dialog" aria-modal="true" aria-labelledby="pass-gate-title">
      <div className={["pass-gate", `player-${handoff.playerId.toLowerCase()}`].join(" ")}>
        <span className="player-mark">{handoff.playerId}</span>
        <h2 id="pass-gate-title">Pass to Player {handoff.playerId}</h2>
        <button type="button" className="pass-gate-button" onClick={onStart}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function getNextPlayer(playerId: PlayerId): PlayerId {
  return playerId === "A" ? "B" : "A";
}

function getNextOpeningPlayerAfterKeep(game: GameState, keepingPlayerId: PlayerId): PlayerId | undefined {
  return (["A", "B"] as const).find(
    (playerId) => playerId !== keepingPlayerId && !game.players[playerId].openingHandKept,
  );
}

async function resolveRecentDeckColorUpdate(deck: RecentDeck): Promise<{ id: string; colors: CardColor[] } | undefined> {
  const resolvedDeck = await resolveDeckImportInput(deck.input);
  const entries = parseDecklist(resolvedDeck.decklist);

  if (entries.length === 0) {
    return undefined;
  }

  const cardLookup = await fetchUniqueCardColorIdentities(entries.map((entry) => entry.name));
  const colors = getDeckColors(entries, cardLookup);

  return colors === undefined ? undefined : { id: deck.id, colors };
}

function getMissingImportDataNames(game: GameState): string[] {
  const names = new Set<string>();

  for (const player of Object.values(game.players)) {
    for (const zoneName of ZONE_NAMES) {
      for (const card of player.zones[zoneName]) {
        if (!card.isToken && !card.imageUrl) {
          names.add(card.name);
        }
      }
    }
  }

  return [...names];
}

function repairMissingCardImports(game: GameState, cardLookup: Map<string, CardPrintData>): GameState {
  let changed = false;
  const players = { ...game.players };

  for (const playerId of ["A", "B"] as const) {
    const player = game.players[playerId];
    const zones = { ...player.zones };
    let playerChanged = false;

    for (const zoneName of ZONE_NAMES) {
      const repairedCards = zones[zoneName].map((card) => {
        const repairedCard = repairCardImportData(card, cardLookup);

        if (repairedCard !== card) {
          playerChanged = true;
        }

        return repairedCard;
      });

      zones[zoneName] = repairedCards;
    }

    if (playerChanged) {
      players[playerId] = { ...player, zones };
      changed = true;
    }
  }

  const missingCards = game.missingCards.filter((missing) => !cardLookup.has(missing.typedName.toLowerCase()));

  if (missingCards.length !== game.missingCards.length) {
    changed = true;
  }

  return changed ? { ...game, players, missingCards, updatedAt: new Date().toISOString() } : game;
}

function repairCardImportData(card: CardInstance, cardLookup: Map<string, CardPrintData>): CardInstance {
  const importData = cardLookup.get(card.name.toLowerCase());

  if (!importData) {
    return card;
  }

  const nextCard = {
    ...card,
    name: importData.name || card.name,
    imageUrl: card.imageUrl ?? importData.imageUrl,
    typeLine: card.typeLine ?? importData.typeLine,
    oracleText: card.oracleText ?? importData.oracleText,
    basePower: card.basePower ?? importData.basePower,
    baseToughness: card.baseToughness ?? importData.baseToughness,
    tokenSuggestions: card.tokenSuggestions ?? importData.tokenSuggestions,
  };

  return hasCardImportDataChanged(card, nextCard) ? nextCard : card;
}

function hasCardImportDataChanged(current: CardInstance, next: CardInstance): boolean {
  return (
    current.name !== next.name ||
    current.imageUrl !== next.imageUrl ||
    current.typeLine !== next.typeLine ||
    current.oracleText !== next.oracleText ||
    current.basePower !== next.basePower ||
    current.baseToughness !== next.baseToughness ||
    current.tokenSuggestions !== next.tokenSuggestions
  );
}

function loadStoredBoolean(key: string, fallback: boolean): boolean {
  const saved = localStorage.getItem(key);

  if (saved === "true") {
    return true;
  }

  if (saved === "false") {
    return false;
  }

  return fallback;
}

function loadSavedGame(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved) as GameState;
    if (parsed.version !== 1 || !parsed.players?.A || !parsed.players?.B) {
      return null;
    }

    return migrateSavedGame(parsed);
  } catch {
    return null;
  }
}

function migrateSavedGame(savedGame: GameState): GameState {
  return {
    ...savedGame,
    playMode: migrateGameMode(savedGame.playMode),
    players: {
      A: migratePlayer(savedGame.players.A),
      B: migratePlayer(savedGame.players.B),
    },
  };
}

function migrateGameMode(playMode?: GameMode): GameMode {
  return playMode === "passAndPlay" ? "passAndPlay" : "solitaire";
}

function migratePlayer(player: GameState["players"][PlayerId]): GameState["players"][PlayerId] {
  return {
    ...player,
    energy: player.energy ?? 0,
    poison: player.poison ?? 0,
    mulligans: player.mulligans ?? 0,
    openingHandKept: player.openingHandKept ?? true,
    zones: migrateZones(player.zones),
  };
}

function migrateZones(zones: PlayerZones): PlayerZones {
  return {
    library: zones.library.map((card) => migrateCardInstance(card, "library")),
    hand: zones.hand.map((card) => migrateCardInstance(card, "hand")),
    battlefield: zones.battlefield.map((card) => migrateCardInstance(card, "battlefield")),
    graveyard: zones.graveyard.map((card) => migrateCardInstance(card, "graveyard")),
    exile: zones.exile.map((card) => migrateCardInstance(card, "exile")),
  };
}

function migrateCardInstance(card: CardInstance, zone: ZoneName): CardInstance {
  const legacyCounterCount = card.counters ?? 0;
  const { counters: _legacyCounters, ...cardWithoutLegacyCounters } = card;
  const shouldInitializePowerToughness =
    zone === "battlefield" &&
    isCreatureCard(card) &&
    card.basePower !== undefined &&
    card.baseToughness !== undefined;

  return {
    ...cardWithoutLegacyCounters,
    displayPower: card.displayPower ?? (shouldInitializePowerToughness ? card.basePower : undefined),
    displayToughness: card.displayToughness ?? (shouldInitializePowerToughness ? card.baseToughness : undefined),
    plusOneCounters: card.plusOneCounters ?? 0,
    genericCounters: card.genericCounters ?? legacyCounterCount,
  };
}
