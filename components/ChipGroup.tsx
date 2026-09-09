interface ChipOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface ChipGroupProps {
  options: ChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
  disabledValues?: string[];
}

export default function ChipGroup({ options, selected, onToggle, disabledValues = [] }: ChipGroupProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        const isDisabled = disabledValues.includes(opt.value) && !isSelected;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={isDisabled}
            aria-pressed={isSelected}
            onClick={() => onToggle(opt.value)}
            className={
              "text-left rounded-card px-5 py-4 border-2 transition-colors font-semibold text-lg bg-panel " +
              (isSelected
                ? "border-emerald-bright text-ink shadow-[0_0_0_3px_rgba(52,211,153,0.12)]"
                : isDisabled
                ? "border-border-soft text-muted/40 cursor-not-allowed"
                : "border-border-soft text-ink-2 hover:border-border")
            }
          >
            {opt.label}
            {opt.sublabel && (
              <span className="block font-normal text-xs mt-1 text-muted">{opt.sublabel}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

