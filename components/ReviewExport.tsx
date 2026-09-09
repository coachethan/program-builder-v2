"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Program, ProgramExercise } from "@/lib/programGenerator";

interface ReviewExportProps {
  program: Program;
  workouts: Record<string, ProgramExercise[]>;
  onBack: () => void;
}

// Survives the full-page redirect to Google and back (React state doesn't) - a plain flag saying
// "the user already clicked export before signing in, so run it automatically once we're back."
const PENDING_EXPORT_KEY = "programBuilderPendingExport";

function priorityLabel(priorities: string[]): string {
  if (priorities.length === 0) return "None";
  return priorities.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" + ");
}

export default function ReviewExport({ program, workouts, onBack }: ReviewExportProps) {
  const { status } = useSession();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);

  async function runExport() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/export-to-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program, workouts })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed.");
      setExportedUrl(data.spreadsheetUrl);
      window.open(data.spreadsheetUrl, "_blank");
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setExporting(false);
    }
  }

  // Coming back from a Google sign-in redirect with a pending export flagged? Run it now,
  // automatically - the user already clicked "export" once, they shouldn't have to click again.
  useEffect(() => {
    if (status === "authenticated" && sessionStorage.getItem(PENDING_EXPORT_KEY) === "1") {
      sessionStorage.removeItem(PENDING_EXPORT_KEY);
      runExport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function handleExportClick() {
    if (status === "authenticated") {
      runExport();
    } else {
      sessionStorage.setItem(PENDING_EXPORT_KEY, "1");
      signIn("google");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Review &amp; export</p>
          <h1 className="text-2xl font-bold text-ink">Your program summary</h1>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-muted uppercase tracking-wider underline underline-offset-4 hover:text-ink"
        >
          Back
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-4 mb-6 border border-border-soft rounded-card bg-panel p-4">
        <div>
          <dt className="text-xs text-muted uppercase tracking-wider mb-1">Split</dt>
          <dd className="text-ink font-semibold">
            {program.split === "upper_lower_4" ? "Upper / Lower" : "Full Body"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted uppercase tracking-wider mb-1">Training days</dt>
          <dd className="text-ink font-semibold">{program.trainingDays} / week</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted uppercase tracking-wider mb-1">Priority</dt>
          <dd className="text-ink font-semibold">{priorityLabel(program.priorities)}</dd>
        </div>
      </dl>

      <div className="space-y-6 mb-8">
        {Object.entries(workouts).map(([key, exercises]) => (
          <div key={key} className="border border-border-soft rounded-card bg-panel overflow-hidden">
            <div className="px-4 py-3 border-b border-border-soft">
              <h2 className="text-ink font-semibold">{key}</h2>
            </div>
            <div className="px-4">
              {exercises.map((ex, i) => (
                <div
                  key={ex.exerciseId + i}
                  className="flex items-center justify-between py-3 border-b border-border-soft last:border-b-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted tabular-nums w-5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-ink-2 text-sm truncate">{ex.exerciseName}</span>
                  </div>
                  <span className="text-xs text-muted tabular-nums shrink-0 ml-3">
                    {ex.sets} &times; {ex.repMin}&ndash;{ex.repMax}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {exportError && <p className="text-amber text-sm mb-3">{exportError}</p>}

      {exportedUrl ? (
        <a
          href={exportedUrl}
          target="_blank"
          rel="noreferrer"
          className="w-full block text-center rounded-control bg-emerald-fill text-white font-semibold px-6 py-3.5 hover:brightness-110 transition"
        >
          Open your spreadsheet
        </a>
      ) : (
        <button
          type="button"
          onClick={handleExportClick}
          disabled={exporting || status === "loading"}
          className="w-full rounded-control bg-emerald-fill text-white font-semibold px-6 py-3.5 hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {exporting
            ? "Exporting..."
            : status === "authenticated"
            ? "Export to Google Sheets"
            : "Sign in with Google to export"}
        </button>
      )}
    </div>
  );
}
