import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, Sparkles, X } from "lucide-react";
import type { CardInstance, TokenDefinition } from "../types";
import { fetchTokenSuggestionsForCardName } from "../utils/scryfall";
import { COMMON_TOKEN_DEFINITIONS, getBattlefieldTokenSuggestions, getTokenKey } from "../utils/tokens";

type TokenPickerModalProps = {
  battlefieldCards: CardInstance[];
  onCreateToken: (token: TokenDefinition, quantity: number, tapped: boolean) => void;
  onClose: () => void;
};

const CUSTOM_TOKEN_ID = "custom-token";

export function TokenPickerModal({
  battlefieldCards,
  onCreateToken,
  onClose,
}: TokenPickerModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [tapped, setTapped] = useState(false);
  const [customName, setCustomName] = useState("Generic Token");
  const [customType, setCustomType] = useState("Token");
  const [customPower, setCustomPower] = useState("");
  const [customToughness, setCustomToughness] = useState("");
  const [lazyTokenSuggestions, setLazyTokenSuggestions] = useState<Record<string, TokenDefinition[]>>({});
  const [isLoadingBattlefieldTokens, setIsLoadingBattlefieldTokens] = useState(false);
  const battlefieldCardsWithLazyTokens = useMemo(
    () =>
      battlefieldCards.map((card) => ({
        ...card,
        tokenSuggestions: card.tokenSuggestions?.length
          ? card.tokenSuggestions
          : lazyTokenSuggestions[card.instanceId],
      })),
    [battlefieldCards, lazyTokenSuggestions],
  );
  const battlefieldSuggestions = useMemo(
    () => getBattlefieldTokenSuggestions(battlefieldCardsWithLazyTokens),
    [battlefieldCardsWithLazyTokens],
  );
  const commonSuggestions = useMemo(() => {
    const battlefieldKeys = new Set(battlefieldSuggestions.map(getTokenKey));
    return COMMON_TOKEN_DEFINITIONS.filter((token) => !battlefieldKeys.has(getTokenKey(token)));
  }, [battlefieldSuggestions]);
  const customToken = useMemo<TokenDefinition>(() => {
    const basePower = parseTokenStat(customPower);
    const baseToughness = parseTokenStat(customToughness);

    return {
      id: CUSTOM_TOKEN_ID,
      name: customName.trim() || "Generic Token",
      typeLine: customType.trim() || "Token",
      basePower,
      baseToughness,
    };
  }, [customName, customPower, customToughness, customType]);

  const adjustQuantity = (delta: number) => {
    setQuantity((current) => Math.min(99, Math.max(1, current + delta)));
  };
  const handleCreateToken = (token: TokenDefinition) => {
    onCreateToken(token, quantity, tapped);
    onClose();
  };

  useEffect(() => {
    const cardsNeedingTokenLookup = battlefieldCards.filter(
      (card) => !card.tokenSuggestions?.length && lazyTokenSuggestions[card.instanceId] === undefined,
    );

    if (cardsNeedingTokenLookup.length === 0) {
      return undefined;
    }

    let isCancelled = false;
    setIsLoadingBattlefieldTokens(true);

    Promise.all(
      cardsNeedingTokenLookup.map(async (card) => ({
        instanceId: card.instanceId,
        tokens: await fetchTokenSuggestionsForCardName(card.name),
      })),
    )
      .then((results) => {
        if (isCancelled) {
          return;
        }

        setLazyTokenSuggestions((current) => {
          const next = { ...current };

          results.forEach(({ instanceId, tokens }) => {
            next[instanceId] = tokens;
          });

          return next;
        });
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingBattlefieldTokens(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [battlefieldCards, lazyTokenSuggestions]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="token-picker-title" onClick={onClose}>
      <section className="token-picker-modal" onClick={(event) => event.stopPropagation()}>
        <header className="token-picker-header">
          <div>
            <h1 id="token-picker-title">
              <Sparkles size={18} />
              Create Token
            </h1>
            <p>
              {isLoadingBattlefieldTokens
                ? "Checking battlefield cards"
                : `${battlefieldSuggestions.length} battlefield suggestion${battlefieldSuggestions.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button type="button" className="icon-button" aria-label="Close token picker" onClick={onClose}>
            <X size={22} />
          </button>
        </header>

        <div className="token-picker-controls">
          <div className="token-quantity-control" role="group" aria-label="Token quantity">
            <button type="button" aria-label="Create fewer tokens" disabled={quantity <= 1} onClick={() => adjustQuantity(-1)}>
              <Minus size={16} />
            </button>
            <strong>{quantity}</strong>
            <button type="button" aria-label="Create more tokens" onClick={() => adjustQuantity(1)}>
              <Plus size={16} />
            </button>
          </div>
          <label className="token-tapped-toggle">
            <input type="checkbox" checked={tapped} onChange={(event) => setTapped(event.currentTarget.checked)} />
            <span>Tapped</span>
          </label>
        </div>

        <div className="token-picker-content">
          {battlefieldSuggestions.length > 0 && (
            <TokenSection title="Battlefield" tokens={battlefieldSuggestions} onCreate={handleCreateToken} />
          )}
          <TokenSection title="Common" tokens={commonSuggestions} onCreate={handleCreateToken} />

          <section className="token-custom-section">
            <h2>Custom</h2>
            <div className="token-custom-grid">
              <label>
                <span>Name</span>
                <input value={customName} onChange={(event) => setCustomName(event.currentTarget.value)} />
              </label>
              <label>
                <span>Type</span>
                <input value={customType} onChange={(event) => setCustomType(event.currentTarget.value)} />
              </label>
              <label>
                <span>Power</span>
                <input value={customPower} inputMode="numeric" onChange={(event) => setCustomPower(event.currentTarget.value)} />
              </label>
              <label>
                <span>Toughness</span>
                <input value={customToughness} inputMode="numeric" onChange={(event) => setCustomToughness(event.currentTarget.value)} />
              </label>
            </div>
            <button type="button" className="token-create-custom" onClick={() => handleCreateToken(customToken)}>
              <Check size={16} />
              Create Custom
            </button>
          </section>
        </div>
      </section>
    </div>
  );
}

type TokenSectionProps = {
  title: string;
  tokens: TokenDefinition[];
  onCreate: (token: TokenDefinition) => void;
};

function TokenSection({ title, tokens, onCreate }: TokenSectionProps) {
  if (tokens.length === 0) {
    return null;
  }

  return (
    <section className="token-section">
      <h2>{title}</h2>
      <div className="token-option-list">
        {tokens.map((token) => (
          <button type="button" className="token-option" key={getTokenKey(token)} onClick={() => onCreate(token)}>
            {token.imageUrl ? (
              <img src={token.imageUrl} alt="" draggable={false} />
            ) : (
              <span className="token-option-placeholder">{getTokenInitials(token.name)}</span>
            )}
            <span>
              <strong>{token.name}</strong>
              <small>{formatTokenDetails(token)}</small>
              {token.sourceName && <em>{token.sourceName}</em>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function formatTokenDetails(token: TokenDefinition): string {
  const stats =
    token.basePower !== undefined && token.baseToughness !== undefined
      ? ` ${token.basePower}/${token.baseToughness}`
      : "";

  return `${token.typeLine ?? "Token"}${stats}`;
}

function getTokenInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function parseTokenStat(value: string): number | undefined {
  const trimmed = value.trim();

  if (!/^-?\d+$/.test(trimmed)) {
    return undefined;
  }

  return Number(trimmed);
}
