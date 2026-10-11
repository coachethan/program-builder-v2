"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  generateProgram,
  Exercise,
  Priority,
  Program
} from "@/lib/programGenerator";
import exercisesRaw from "@/lib/exercises.json";
import StepProgress from "@/components/StepProgress";
import ChipGroup from "@/components/ChipGroup";
import GeneratingState from "@/components/GeneratingState";
import ProgramView from "@/components/ProgramView";

const exercises = exercisesRaw as unknown as Exercise[];

const DAY_OPTIONS = [
  { value: "2", label: "2 days", sublabel: "Full Body" },
  { value: "3", label: "3 days", sublabel: "Full Body" },
  { value: "4", label: "4 days", sublabel: "Upper / Lower" }
];

const PRIORITY_OPTIONS: { value: string; label: string; sublabel?: string }[] = [
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "arms", label: "Arms" },
  { value: "legs", label: "Legs" },
  { value: "glutes", label: "Glutes" },
  { value: "none", label: "None", sublabel: "Balanced default" }
];

const STEPS = ["Training days", "Priorities", "Your program"];

type WizardStage = "days" | "priorities" | "generating" | "result";

// Must match the identical constant in components/ReviewExport.tsx exactly - that's where this
// gets written (right before the full-page redirect to Google sign-in). A full OAuth redirect
// reloads the entire page, wiping every bit of React state (which stage we're on, the generated
// program) - this is the only thing that survives that reload, so this page checks it on mount
// and restores everything: which stage to show, the program, and a flag telling ReviewExport to
// finish the export automatically instead of making the user click a second time.
const PENDING_EXPORT_KEY = "programBuilderPendingExport";

export default function BuildPage() {
  const [stage, setStage] = useState<WizardStage>("days");
  const [days, setDays] = useState<string | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [noneSelected, setNoneSelected] = useState(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoExport, setAutoExport] = useState(false);

  // Runs once, right when this page first loads - including right after coming back from the
  // Google sign-in redirect. If there's a saved pending export, restore the whole app straight to
  // the result screen with that program, instead of dumping the user back at "how many days?".
  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_EXPORT_KEY);
    if (!pending) return;
    sessionStorage.removeItem(PENDING_EXPORT_KEY);
    try {
      const restored = JSON.parse(pending) as Program;
      setDays(String(restored.trainingDays));
      setPriorities(restored.priorities);
      setNoneSelected(restored.priorities.length === 0);
      setProgram(restored);
      setAutoExport(true);
      setStage("result");
    } catch {
      // Malformed/corrupt saved data - just fall through to the normal starting screen.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepIndex = stage === "days" ? 0 : stage === "priorities" ? 1 : 2;

  function togglePriority(value: string) {
    if (value === "none") {
      setPriorities([]);
      setNoneSelected(true);
      return;
    }
    setNoneSelected(false);
    const p = value as Priority;
    setPriorities((prev) => {
      if (prev.includes(p)) return prev.filter((x) => x !== p);
      if (prev.length >= 2) return prev; // max 2, per spec
      return [...prev, p];
    });
  }

  function handleGenerate() {
    if (!days) return;
    setError(null);
    setStage("generating");
    // Brief, honest loading state — the engine itself is near-instant (deterministic, no network
    // call), this just gives the "applying the rule set" moment room to register.
    setTimeout(() => {
      try {
        const result = generateProgram(Number(days) as 2 | 3 | 4, priorities, exercises);
        setProgram(result);
        setStage("result");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong building the program.");
        setStage("priorities");
      }
    }, 600);
  }

  function handleStartOver() {
    setStage("days");
    setDays(null);
    setPriorities([]);
    setNoneSelected(false);
    setProgram(null);
    setError(null);
    setAutoExport(false);
  }

  function handleBackToPriorities() {
    setStage("priorities");
    setProgram(null);
    setError(null);
    setAutoExport(false);
    // days and the current priority selection are intentionally kept, so the user is editing
    // their existing picks rather than starting from scratch.
  }

  return (
    <main className="min-h-screen bg-bg">
      <nav className="flex items-center px-6 py-5 max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="h-7 w-7 rounded-full bg-ink text-bg font-bold text-xs flex items-center justify-center">
            PB
          </span>
          <span className="font-semibold text-ink">Program Builder</span>
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pb-24">
        {stage !== "result" && (
          <div className="mb-10">
            <StepProgress steps={STEPS} currentIndex={stepIndex} />
          </div>
        )}

        {stage === "days" && (
          <div>
            <h1 className="text-2xl font-bold text-ink mb-2">How many training days a week?</h1>
            <p className="text-muted text-sm mb-6">2&ndash;3 days runs a Full Body split. 4 days runs Upper/Lower.</p>
            <ChipGroup
              options={DAY_OPTIONS}
              selected={days ? [days] : []}
              onToggle={(v) => {
                setDays(v);
                setStage("priorities");
              }}
            />
          </div>
        )}

        {stage === "priorities" && (
          <div>
            <h1 className="text-2xl font-bold text-ink mb-2">Priority muscles</h1>
            <p className="text-muted text-sm mb-6">Pick 1 or 2, or None for a balanced default.</p>
            <ChipGroup
              options={PRIORITY_OPTIONS}
              selected={noneSelected ? ["none"] : priorities}
              onToggle={togglePriority}
              disabledValues={
                !noneSelected && priorities.length >= 2
                  ? PRIORITY_OPTIONS.map((o) => o.value).filter((v) => v !== "none")
                  : []
              }
            />
            {error && <p className="text-amber text-sm mt-4">{error}</p>}
            <div className="flex items-center justify-between mt-8">
              <button
                type="button"
                onClick={() => setStage("days")}
                className="text-sm text-muted hover:text-ink"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                className="rounded-control bg-emerald-fill text-white font-semibold px-6 py-3 hover:brightness-110 transition"
              >
                Build my program &rarr;
              </button>
            </div>
          </div>
        )}

        {stage === "generating" && <GeneratingState />}

        {stage === "result" && program && (
          <ProgramView
            initialProgram={program}
            db={exercises}
            onStartOver={handleStartOver}
            onBackToPriorities={handleBackToPriorities}
            autoShowReview={autoExport}
          />
        )}
      </div>
    </main>
  );
}
