interface StepProgressProps {
  steps: string[];
  currentIndex: number; // 0-based
}

export default function StepProgress({ steps, currentIndex }: StepProgressProps) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${currentIndex + 1} of ${steps.length}`}>
      {steps.map((label, i) => {
        const isComplete = i < currentIndex;
        const isActive = i === currentIndex;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors " +
                  (isComplete
                    ? "bg-panel-2 text-emerald-bright border border-emerald-bright/40"
                    : isActive
                    ? "bg-emerald text-bg"
                    : "bg-panel text-muted border border-border-soft")
                }
              >
                {isComplete ? "\u2713" : i + 1}
              </span>
              <span className={"text-sm font-medium hidden sm:inline " + (isActive ? "text-ink" : "text-muted")}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={"h-px flex-1 mx-3 " + (isComplete ? "bg-emerald-bright/40" : "bg-border-soft")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
