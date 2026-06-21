import { Minus, Plus, RotateCw, X } from "lucide-react";
import { useEffect } from "react";
import type { CardCounterType, CardInstance } from "../types";
import { getGenericCounterCount, getPlusOneCounterCount } from "../utils/game";

type CardLightboxProps = {
  card: CardInstance;
  onClose: () => void;
  onAdjustCounter: (counterType: CardCounterType, delta: number) => void;
  onTransform: () => void;
};

export function CardLightbox({
  card,
  onClose,
  onAdjustCounter,
  onTransform,
}: CardLightboxProps) {
  const plusOneCounters = getPlusOneCounterCount(card);
  const genericCounters = getGenericCounterCount(card);
  const canTransform = Boolean(card.faces && card.faces.length > 1);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="lightbox-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="lightbox-card" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button lightbox-close" type="button" aria-label="Close card view" onClick={onClose}>
          <X size={22} />
        </button>
        <button className="lightbox-face-button" type="button" aria-label={`Close card view for ${card.name}`} onClick={onClose}>
          {card.imageUrl ? (
            <img className="lightbox-image" src={card.imageUrl} alt={card.name} draggable={false} />
          ) : (
            <div className="lightbox-placeholder">
              <span>{card.isToken ? "Token" : "Missing image"}</span>
              <strong>{card.name}</strong>
            </div>
          )}
        </button>
        <div className="lightbox-control-panel">
          {canTransform && (
            <button type="button" className="lightbox-transform-button" onClick={onTransform}>
              <RotateCw size={17} />
              Transform
            </button>
          )}
          <div className="lightbox-counter-panel" aria-label="Card counters">
            <CounterControl
              label="+1/+1"
              count={plusOneCounters}
              allowNegative
              onDecrease={() => onAdjustCounter("plusOne", -1)}
              onIncrease={() => onAdjustCounter("plusOne", 1)}
            />
            <CounterControl
              label="Generic"
              count={genericCounters}
              onDecrease={() => onAdjustCounter("generic", -1)}
              onIncrease={() => onAdjustCounter("generic", 1)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type CounterControlProps = {
  label: string;
  count: number;
  allowNegative?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
};

function CounterControl({ label, count, allowNegative, onDecrease, onIncrease }: CounterControlProps) {
  const decreaseLabel = allowNegative ? `Decrease ${label} counter` : `Remove ${label} counter`;

  return (
    <div className="lightbox-counter-group">
      <span className="lightbox-counter-label">{label}</span>
      <button
        type="button"
        className="lightbox-counter-button"
        disabled={!allowNegative && count === 0}
        aria-label={decreaseLabel}
        onClick={onDecrease}
      >
        <Minus size={17} />
      </button>
      <strong className="lightbox-counter-value">{count}</strong>
      <button
        type="button"
        className="lightbox-counter-button"
        aria-label={`Add ${label} counter`}
        onClick={onIncrease}
      >
        <Plus size={17} />
      </button>
    </div>
  );
}
