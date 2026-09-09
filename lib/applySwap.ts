import { Exercise, ProgramExercise } from "./programGenerator";

// A swap must: stay within the approved swap set for that slot, preserve sets, preserve reps,
// preserve workout position, and never exceed volume rules. RIR is a global weekly value (not
// stored per exercise) so it's untouched by construction. Position is preserved because we
// replace in place rather than re-sorting; sets/reps are preserved because every exercise in
// this library shares the same universal 2 x 6-10 scheme (except the explicit 1-set exceptions,
// which are preserved via the spread below since sets is never touched by this function).
//
// Chest and shoulder swaps are independent of each other (press<->fly, press<->raise) - the
// earlier linked/cascading pairing mechanism was explicitly retired.
export function applySwap(workout: ProgramExercise[], targetExerciseId: string, replacement: Exercise): ProgramExercise[] {
  return workout.map(item => {
    if (item.exerciseId !== targetExerciseId) return item;
    return {
      ...item,
      exerciseId: replacement.exercise_id,
      exerciseName: replacement.exercise_name,
      programmingRole: replacement.programming_role,
      substitutionGroup: replacement.substitution_group
      // sets, repMin, repMax, swapRoles, swapMovementPattern intentionally carried over unchanged
    };
  });
}
