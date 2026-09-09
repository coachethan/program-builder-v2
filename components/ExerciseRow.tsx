import { ProgramExercise } from "@/lib/programGenerator";

interface ExerciseRowProps {
  index: number;
  exercise: ProgramExercise;
  rir: string;
  onSwapClick: () => void;
  onRemoveClick: () => void;
}

export default function ExerciseRow({ index, exercise, rir, onSwapClick, onRemoveClick }: ExerciseRowProps) {
  return (
    <div className="flex items-center gap-3 py-4 border-b border-border-soft last:border-b-0">
      <span className="text-xs text-muted tabular-nums w-5 shrink-0">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-ink font-semibold leading-snug truncate">{exercise.exerciseName}</p>
        <p className="text-xs text-muted mt-1 tabular-nums">
          {exercise.sets} sets &middot; {exercise.repMin}&ndash;{exercise.repMax} reps &middot; RIR {rir}
        </p>
      </div>
      <button
        type="button"
        onClick={onSwapClick}
        className="shrink-0 text-xs font-semibold uppercase tracking-wider text-emerald-bright border border-emerald-bright/30 rounded-control px-3 py-2 hover:bg-emerald-bright hover:text-bg hover:border-emerald-bright transition-colors"
      >
        Swap
      </button>
      <button
        type="button"
        onClick={onRemoveClick}
        aria-label={`Remove ${exercise.exerciseName}`}
        title="Remove"
        className="shrink-0 h-8 w-8 flex items-center justify-center text-muted hover:text-ink hover:bg-panel-2 rounded-control transition-colors text-lg leading-none"
      >
        &times;
      </button>
    </div>
  );
}


