import { Exercise } from "@/lib/programGenerator";

interface SwapModalProps {
  open: boolean;
  currentExerciseName: string;
  options: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export default function SwapModal({ open, currentExerciseName, options, onSelect, onClose }: SwapModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bg/80"
      role="dialog"
      aria-modal="true"
      aria-label={`Swap ${currentExerciseName}`}
      onClick={onClose}
    >
      <div
        className="bg-panel border border-border-soft rounded-card w-full sm:max-w-sm max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-border-soft flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Currently</p>
            <p className="text-ink font-semibold">{currentExerciseName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-ink text-lg leading-none px-1"
          >
            &times;
          </button>
        </div>

        <div className="px-2 py-2">
          {options.length === 0 ? (
            <p className="text-muted text-sm px-4 py-6">No swap available.</p>
          ) : (
            options.map((opt) => (
              <button
                key={opt.exercise_id}
                type="button"
                onClick={() => onSelect(opt)}
                className="w-full text-left px-4 py-4 rounded-control hover:bg-panel-2 transition-colors border-b border-border-soft last:border-b-0"
              >
                <p className="text-ink font-medium">{opt.exercise_name}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

