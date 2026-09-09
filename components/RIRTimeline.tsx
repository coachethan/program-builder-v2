import { getRIR } from "@/lib/programGenerator";

// Weeks are a genuine, real-world sequence (an 8-week progression), so numbered markers
// are earned here — this isn't a decorative 1/2/3 list.
export default function RIRTimeline() {
  const weeks = Array.from({ length: 8 }, (_, i) => i + 1);

  return (
    <div className="border border-border-soft rounded-card p-4 bg-panel">
      <p className="text-xs text-muted uppercase tracking-wider mb-3">RIR progression &mdash; 8 weeks</p>
      <div className="flex justify-between">
        {weeks.map((w) => {
          const rir = getRIR(w);
          const isZero = rir === "0";
          return (
            <div key={w} className="flex flex-col items-center gap-2">
              <div
                className={
                  "h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold tabular-nums border " +
                  (isZero
                    ? "bg-amber/15 border-amber text-amber"
                    : "bg-panel-2 border-emerald-bright/30 text-emerald-bright")
                }
                title={`Week ${w}: RIR ${rir}`}
              >
                {rir}
              </div>
              <span className="text-[10px] text-muted tabular-nums">W{w}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

