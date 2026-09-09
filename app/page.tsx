import Link from "next/link";
import { generateProgram, getRIR, Exercise } from "@/lib/programGenerator";
import exercisesRaw from "@/lib/exercises.json";

const exercises = exercisesRaw as unknown as Exercise[];

export default function LandingPage() {
  // Real output, not mockup copy — a live sample from the actual engine (3-day, Chest priority),
  // so the preview card shown to a visitor is honest about what they'll get.
  const sample = generateProgram(3, ["chest"], exercises);
  const previewWeeks = [1, 3, 6, 8];

  return (
    <main className="hero-glow min-h-screen">
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <span className="h-7 w-7 rounded-full bg-ink text-bg font-bold text-xs flex items-center justify-center">
            PB
          </span>
          <span className="font-semibold text-ink">Program Builder</span>
        </div>
        <Link
          href="/build"
          className="rounded-control bg-emerald-fill text-white font-semibold text-sm px-4 py-2 hover:brightness-110 transition"
        >
          Build free
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pb-20 pt-8 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-bright" />
            <span className="text-xs tracking-wider uppercase text-muted">
              Free forever &middot; no account &middot; no paywall
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-ink leading-[1.1] mb-6 tracking-tight">
            Set by the rules.
            <br />
            Not by an algorithm&rsquo;s mood.
          </h1>

          <p className="text-ink-2 text-base leading-relaxed mb-8 max-w-md">
            Choose your training days and up to two priority muscles. Get a complete 8-week
            hypertrophy program from a fixed exercise database and rule set &mdash; the same
            output every time, nothing improvised.
          </p>

          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              href="/build"
              className="rounded-control bg-emerald-fill text-white font-semibold px-6 py-3.5 hover:brightness-110 transition"
            >
              Build my program &rarr;
            </Link>
            <a
              href="#how"
              className="rounded-control border border-border text-ink font-semibold px-6 py-3.5 hover:border-muted transition"
            >
              See how it works
            </a>
          </div>

          <p className="text-sm text-muted mb-6">Two questions, about 30 seconds.</p>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-bright">&#10003;</span> Fixed rule engine
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-bright">&#10003;</span> 8-week RIR progression
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-bright">&#10003;</span> Swap any exercise
            </li>
          </ul>
        </div>

        {/* Live preview card — same pattern as the reference's device mockup, but driven by real generator output */}
        <div className="rounded-card overflow-hidden border border-border-soft shadow-2xl">
          <div className="bg-panel px-5 py-4 flex items-center justify-between border-b border-border-soft">
            <div className="flex items-center gap-2.5">
              <span className="h-6 w-6 rounded-full bg-ink text-bg font-bold text-[10px] flex items-center justify-center">
                PB
              </span>
              <span className="text-ink text-sm font-semibold">Program preview</span>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-bright">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-bright" /> Live sample
            </span>
          </div>

          <div className="bg-white p-5">
            <p className="text-[11px] tracking-wider uppercase text-gray-400 font-semibold mb-1">
              3-day &middot; Full Body &middot; Chest priority
            </p>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-900 font-bold text-xl">Full Body A</h2>
              <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">
                {sample.workouts["Full Body A"].length} exercises
              </span>
            </div>

            <div className="space-y-3 mb-5">
              {sample.workouts["Full Body A"].slice(0, 3).map((ex, i) => (
                <div key={ex.exerciseId} className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs font-semibold tabular-nums w-4">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-900 text-sm font-semibold">{ex.exerciseName}</p>
                    <p className="text-gray-500 text-xs">
                      {ex.sets} sets &middot; {ex.repMin}&ndash;{ex.repMax} reps
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 grid grid-cols-4 gap-2">
              {previewWeeks.map((w) => {
                const rir = getRIR(w);
                const isZero = rir === "0";
                return (
                  <div key={w}>
                    <p className="text-[10px] tracking-wider uppercase text-gray-400 font-semibold mb-0.5">
                      Week {w}
                    </p>
                    <p className={"text-sm font-bold " + (isZero ? "text-amber" : "text-gray-900")}>
                      RIR {rir}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div id="how" className="border-t border-border-soft">
        <div className="max-w-6xl mx-auto px-6 py-10 grid sm:grid-cols-3 gap-8">
          <div>
            <p className="font-semibold text-ink mb-1">No invented exercises</p>
            <p className="text-sm text-muted leading-relaxed">
              If the database doesn&rsquo;t have it, the program doesn&rsquo;t include it.
            </p>
          </div>
          <div>
            <p className="font-semibold text-ink mb-1">Deterministic, every time</p>
            <p className="text-sm text-muted leading-relaxed">
              Same inputs, same output &mdash; the rules decide, not a model&rsquo;s guess.
            </p>
          </div>
          <div>
            <p className="font-semibold text-ink mb-1">Swap what doesn&rsquo;t fit</p>
            <p className="text-sm text-muted leading-relaxed">
              Every exercise can be replaced with an approved equivalent, in place.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
