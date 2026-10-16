"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Program, ProgramExercise } from "@/lib/programGenerator";

interface ReviewExportProps {
  program: Program;
  workouts: Record<string, ProgramExercise[]>;
  onBack: () => void;
  // True when this component is being shown right after returning from the Google sign-in
  // redirect (restored by app/build/page.tsx). Triggers the export automatically instead of
  // making the user click a second time.
  autoExport?: boolean;
}

// Must match the identical constant in app/build/page.tsx - that's what reads and restores this
// on the way back from the redirect. Saves the FULL program+workouts (not just a flag) because the
// entire page reloads on the way back from Google, wiping all React state - this is the only
// thing that survives, so it has to carry everything needed to resume exactly where we left off.
const PENDING_EXPORT_KEY = "programBuilderPendingExport";

// Google sign-ins hand the site a short-lived pass (about an hour). The site's own login cookie
// lasts much longer, so someone can look signed in while the Google pass inside it is dead.
// When that happens we send them through Google sign-in again, automatically, once. This stamp
// (a timestamp, so an abandoned attempt goes stale) stops that from looping forever if Google
// still rejects the new sign-in.
const REAUTH_KEY = "programBuilderReauthTried";
const REAUTH_WINDOW_MS = 2 * 60 * 1000;

function reauthRecentlyTried(): boolean {
  const raw = sessionStorage.getItem(REAUTH_KEY);
  if (!raw) return false;
  return Date.now() - Number(raw) < REAUTH_WINDOW_MS;
}

// True when the failure means "Google no longer accepts this sign-in" (expired pass, or the Drive
// permission checkbox was not ticked). Signing in with Google again fixes both. The message
// strings are the ones lib/googleSheetsExport.ts and the export route produce.
function needsFreshSignIn(httpStatus: number, message: string): boolean {
  return (
    httpStatus === 401 ||
    message.includes("Failed to create spreadsheet (401)") ||
    message.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT")
  );
}

function priorityLabel(priorities: string[]): string {
  if (priorities.length === 0) return "None";
  return priorities.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" + ");
}

export default function ReviewExport({ program, workouts, onBack, autoExport }: ReviewExportProps) {
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
      if (!res.ok) {
        const message: string = data.error || "Export failed.";
        if (needsFreshSignIn(res.status, message)) {
          if (reauthRecentlyTried()) {
            sessionStorage.removeItem(REAUTH_KEY);
            throw new Error(
              "Google did not accept the sign-in. Click the button to try again, and tick the permission checkbox if Google shows one."
            );
          }
          // Save the program (the page reloads on the way to Google) and go sign in again.
          sessionStorage.setItem(REAUTH_KEY, String(Date.now()));
          sessionStorage.setItem(PENDING_EXPORT_KEY, JSON.stringify(program));
          signIn("google");
          return;
        }
        throw new Error(message);
      }
      sessionStorage.removeItem(REAUTH_KEY);
      setExportedUrl(data.spreadsheetUrl);
      window.open(data.spreadsheetUrl, "_blank");
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setExporting(false);
    }
  }

  // Coming back from the Google sign-in redirect with autoExport set (restored by the page-level
  // component)? Finish the export automatically once the session is confirmed - the user already
  // clicked "export" once, they shouldn't have to click again.
  useEffect(() => {
    if (status === "authenticated" && autoExport) {
      runExport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, autoExport]);

  function handleExportClick() {
    if (status === "authenticated") {
      runExport();
    } else {
      // Save everything needed to resume - a full-page redirect to Google is about to wipe all
      // in-memory React state, including which stage of the wizard we were on.
      sessionStorage.setItem(PENDING_EXPORT_KEY, JSON.stringify(program));
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
        <>
          <p className="text-xs text-muted mb-3">
            Google may ask you to sign in and tick a permission checkbox. Tick it, then continue,
            so the spreadsheet can be created in your Drive.
          </p>
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
        </>
      )}
    </div>
  );
}
