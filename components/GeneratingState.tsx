export default function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-end gap-1.5 mb-8 h-10" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-2.5 rounded-sm bg-emerald motion-safe:animate-pulse"
            style={{
              height: `${16 + i * 6}px`,
              animationDelay: `${i * 120}ms`
            }}
          />
        ))}
      </div>
      <p className="text-xl text-ink font-semibold mb-2">Loading the plan</p>
      <p className="text-xs text-muted uppercase tracking-wider">
        Applying the rule set &mdash; no guesswork
      </p>
    </div>
  );
}

