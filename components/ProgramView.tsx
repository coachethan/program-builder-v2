"use client";

import { useState } from "react";
import { Exercise, Program, ProgramExercise, getRIR, getSwapOptions } from "@/lib/programGenerator";
import { applySwap } from "@/lib/applySwap";
import ExerciseRow from "./ExerciseRow";
import SwapModal from "./SwapModal";
import RIRTimeline from "./RIRTimeline";
import ReviewExport from "./ReviewExport";

interface ProgramViewProps {
  initialProgram: Program;
  db: Exercise[];
  onStartOver: () => void;
  onBackToPriorities: () => void;
}

interface SwapTarget {
  workoutKey: string;
  exercise: ProgramExercise;
}

export default function ProgramView({ initialProgram, db, onStartOver, onBackToPriorities }: ProgramViewProps) {
  const [workouts, setWorkouts] = useState(initialProgram.workouts);
  const workoutKeys = Object.keys(workouts);
  const [activeWorkout, setActiveWorkout] = useState(workoutKeys[0]);
  const [week, setWeek] = useState(1);
  const [swapTarget, setSwapTarget] = useState<SwapTarget | null>(null);
  const [showReview, setShowReview] = useState(false);

  const rir = getRIR(week);

  function handleSelectReplacement(replacement: Exercise) {
    if (!swapTarget) return;
    setWorkouts((prev) => ({
      ...prev,
      [swapTarget.workoutKey]: applySwap(prev[swapTarget.workoutKey], swapTarget.exercise.exerciseId, replacement)
    }));
    setSwapTarget(null);
  }

  function handleRemove(workoutKey: string, exerciseId: string) {
    setWorkouts((prev) => ({
      ...prev,
      [workoutKey]: prev[workoutKey].filter((ex) => ex.exerciseId !== exerciseId)
    }));
  }

  if (showReview) {
    return (
      <ReviewExport
        program={{ ...initialProgram, workouts }}
        workouts={workouts}
        onBack={() => setShowReview(false)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBackToPriorities}
            className="text-xs text-muted hover:text-ink flex items-center gap-1 mb-3"
          >
            &larr; Reselect priorities
          </button>
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Your program</p>
          <h1 className="text-2xl font-bold text-ink">
            {initialProgram.trainingDays}-day &middot;{" "}
            {initialProgram.split === "upper_lower_4" ? "Upper / Lower" : "Full Body"}
          </h1>
        </div>
        <button
          type="button"
          onClick={onStartOver}
          className="text-xs text-muted uppercase tracking-wider underline underline-offset-4 hover:text-ink shrink-0"
        >
          Start over
        </button>
      </div>

      <div className="mb-6">
        <RIRTimeline />
      </div>

      <div className="mb-4">
        <label className="text-xs text-muted uppercase tracking-wider block mb-2">Viewing week</label>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 8 }, (_, i) => i + 1).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeek(w)}
              aria-pressed={week === w}
              className={
                "h-8 w-8 text-xs tabular-nums rounded-control border transition-colors " +
                (week === w
                  ? "bg-emerald text-bg border-emerald"
                  : "bg-panel border-border-soft text-muted hover:border-border")
              }
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {workoutKeys.length > 1 && (
        <div className="flex border-b border-border-soft mb-2">
          {workoutKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveWorkout(key)}
              className={
                "font-semibold px-4 py-3 text-sm border-b-2 -mb-px transition-colors " +
                (activeWorkout === key
                  ? "border-emerald-bright text-ink"
                  : "border-transparent text-muted hover:text-ink")
              }
            >
              {key}
            </button>
          ))}
        </div>
      )}

      <div className="border border-border-soft rounded-card bg-panel px-4">
        {workouts[activeWorkout].length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">
            All exercises removed from this day.
          </p>
        ) : (
          workouts[activeWorkout].map((ex, i) => (
            <ExerciseRow
              key={ex.exerciseId + i}
              index={i}
              exercise={ex}
              rir={rir}
              onSwapClick={() => setSwapTarget({ workoutKey: activeWorkout, exercise: ex })}
              onRemoveClick={() => handleRemove(activeWorkout, ex.exerciseId)}
            />
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowReview(true)}
        className="w-full mt-6 rounded-control border border-border text-ink font-semibold px-6 py-3.5 hover:border-emerald-bright transition-colors"
      >
        Review &amp; export
      </button>

      <SwapModal
        open={swapTarget !== null}
        currentExerciseName={swapTarget?.exercise.exerciseName ?? ""}
        options={swapTarget ? getSwapOptions(swapTarget.exercise, db) : []}
        onSelect={handleSelectReplacement}
        onClose={() => setSwapTarget(null)}
      />
    </div>
  );
}
