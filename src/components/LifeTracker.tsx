import { Minus, Plus } from "lucide-react";

type LifeTrackerProps = {
  playerName: string;
  life: number;
  onChange: (delta: number) => void;
};

export function LifeTracker({ playerName, life, onChange }: LifeTrackerProps) {
  return (
    <div className="life-tracker" aria-label={`${playerName} life total`}>
      <button type="button" className="life-button" aria-label={`${playerName} loses 1 life`} onClick={() => onChange(-1)}>
        <Minus size={18} />
      </button>
      <strong>{life}</strong>
      <button type="button" className="life-button" aria-label={`${playerName} gains 1 life`} onClick={() => onChange(1)}>
        <Plus size={18} />
      </button>
    </div>
  );
}
