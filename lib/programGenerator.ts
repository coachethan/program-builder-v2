export type Priority = "chest" | "back" | "shoulders" | "arms" | "legs" | "glutes";
export type Split = "full_body_2" | "full_body_3" | "upper_lower_4";

export interface Exercise {
  exercise_id: string;
  exercise_name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  movement_pattern: string;
  exercise_type: string;
  programming_role: string;
  substitution_group: string;
  default_sets: number;
  rep_min: number;
  rep_max: number;
  active: boolean;
}

export interface ProgramExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  repMin: number;
  repMax: number;
  programmingRole: string;
  substitutionGroup: string;
  // Present on slots with a confirmed scoped swap exception. When set, valid swap targets are
  // exercises whose programming_role is in this list, instead of the normal same-substitutionGroup
  // rule. This never changes swap behavior for any other slot. Chest and shoulder slots use this
  // to offer their press<->fly / press<->raise choice; these are independent, NOT linked to each
  // other (the earlier linked-pairing mechanism was explicitly retired).
  swapRoles?: string[];
  // Optional additional constraint used alongside swapRoles: when set, valid swap targets must
  // also match this movement_pattern. Needed because some programming_roles (e.g. back_lat) span
  // more than one movement pattern (row vs. pulldown) and the confirmed swap is pattern-specific.
  swapMovementPattern?: string;
}

export interface Program {
  trainingDays: number;
  split: Split;
  priorities: Priority[];
  workouts: Record<string, ProgramExercise[]>;
}

const RIR: Record<number, string> = { 1: "1-2", 2: "1", 3: "1", 4: "1", 5: "1", 6: "0", 7: "0", 8: "0" };

const findRole = (db: Exercise[], role: string): Exercise => {
  const candidates = db.filter(e => e.active && e.programming_role === role);
  if (!candidates.length) throw new Error(`No active exercise exists for role: ${role}`);
  return candidates[0];
};

const make = (db: Exercise[], role: string, swapRoles?: string[], setsOverride?: number): ProgramExercise => {
  const e = findRole(db, role);
  const pe: ProgramExercise = {
    exerciseId: e.exercise_id,
    exerciseName: e.exercise_name,
    sets: setsOverride ?? 2,
    repMin: 6,
    repMax: 10,
    programmingRole: e.programming_role,
    substitutionGroup: e.substitution_group
  };
  if (swapRoles) pe.swapRoles = swapRoles;
  return pe;
};

// Some programming_roles span more than one movement_pattern (e.g. back_lat covers both the
// vertical-pull pulldown/pullup AND the horizontal-row exercises). Use this when a slot needs a
// specific movement pattern, not just any exercise carrying that role.
const findByRoleAndPattern = (db: Exercise[], role: string, movementPattern: string): Exercise => {
  const candidates = db.filter(e => e.active && e.programming_role === role && e.movement_pattern === movementPattern);
  if (!candidates.length) throw new Error(`No active exercise exists for role: ${role} with movement pattern: ${movementPattern}`);
  return candidates[0];
};

const makeExact = (e: Exercise, swapRoles?: string[], swapMovementPattern?: string): ProgramExercise => {
  const pe: ProgramExercise = {
    exerciseId: e.exercise_id,
    exerciseName: e.exercise_name,
    sets: 2,
    repMin: 6,
    repMax: 10,
    programmingRole: e.programming_role,
    substitutionGroup: e.substitution_group
  };
  if (swapRoles) pe.swapRoles = swapRoles;
  if (swapMovementPattern) pe.swapMovementPattern = swapMovementPattern;
  return pe;
};

// A "chest-supported row" default, pinned to the horizontal_row pattern (back_lat's role also
// covers a vertical-pull pulldown/pullup, which isn't a row). Swaps across both back_lat and
// back_trap row variants, excluding the pulldown and the trap shrug - neither is a row.
function makeRowChoice(db: Exercise[]): ProgramExercise {
  const rowEx = findByRoleAndPattern(db, "back_lat", "horizontal_row");
  return makeExact(rowEx, ["back_lat", "back_trap"], "horizontal_row");
}

const UPPER_CATEGORIES = new Set<Priority>(["chest", "back", "shoulders", "arms"]);

// ============================================================================
// FULL BODY (2-3 day)
// ============================================================================

// No priority selected ("None"): fixed 7-exercise sequence. Chest and shoulder freely swappable
// (press<->fly, press<->raise); biceps swappable to triceps; no trap or adductor exercise here.
function buildFullBodyNone(db: Exercise[]): ProgramExercise[] {
  return [
    make(db, "chest_press", ["chest_press", "chest_fly"]),
    makeRowChoice(db),
    make(db, "shoulder_raise", ["shoulder_press", "shoulder_raise"]),
    make(db, "biceps", ["biceps", "triceps"]),
    make(db, "calves"),
    make(db, "quad_isolation"),
    make(db, "posterior_compound")
  ];
}

// Upper-focus (priority 1 is chest/back/shoulders/arms): 5 upper exercises.
// Category exercise counts: chest is always 1 (2x chest exercises would double one muscle's
// weekly volume past the 6-set/week cap at 3-day frequency). Back and Shoulders are 2 if they're
// priority 1, else 1 (their natural default). Arms is ALWAYS 2 (both biceps and triceps)
// whenever it's explicitly a priority - either rank - never cut down to 1. When arms isn't
// selected at all, it fills whatever's left to reach exactly 5 (1 if priority 1 took an extra
// slot, i.e. priority 1 is back or shoulders; 2 otherwise).
//
// Guaranteeing arms=2 whenever it's priority 2 pushes [back,arms] and [shoulders,arms]
// specifically to 6 (one over the cap), since priority 1 there already took an extra slot too.
// Those two combos are resolved separately below: Shoulders gives up one exercise instead
// (rather than cutting triceps, which would now contradict Arms being an explicit priority), and
// Chest permanently loses its fly option in those two scenarios - there's no shoulder-press
// reason to avoid it once Shoulders' count has been reduced.
function buildFullBodyUpperFocusUpper(db: Exercise[], priorities: Priority[]): ProgramExercise[] {
  const p1 = priorities[0];
  const p2 = priorities[1];

  if (p2 === "arms" && (p1 === "back" || p1 === "shoulders")) {
    return buildBackOrShouldersPlusArmsOverflow(db, p1);
  }

  const chestCount = 1;
  const backCount = p1 === "back" ? 2 : 1;
  const shoulderCount = p1 === "shoulders" ? 2 : 1;
  const armsIsPriority = p1 === "arms" || p2 === "arms";
  const armsCount = armsIsPriority ? 2 : 5 - chestCount - backCount - shoulderCount;

  // Chest defaults to fly specifically when Shoulders is priority 1 (guaranteeing shoulder press
  // is already present) - confirmed via the Shoulders+Chest example. Otherwise defaults to press.
  // Always freely swappable either way (linked pairing was explicitly retired).
  function chestExercises(): ProgramExercise[] {
    const defaultRole = p1 === "shoulders" ? "chest_fly" : "chest_press";
    return [make(db, defaultRole, ["chest_press", "chest_fly"])];
  }
  // When Back gets its full 2-exercise form (it's priority 1), Lat defaults to pulldown/pullup
  // specifically. When Back is merged to a single slot (not priority 1), that slot defaults to
  // the row instead - confirmed via the Shoulders+Chest example ("chest-supported row variation"),
  // and consistent with makeRowChoice's default everywhere else it's used (None sequence,
  // lower-focus upper block).
  function backExercises(count: number): ProgramExercise[] {
    return count === 2 ? [make(db, "back_lat"), make(db, "back_trap")] : [makeRowChoice(db)];
  }
  // Volume cap: a muscle group maxes at 3 sets/session. Press+raise together would be 4 (2+2),
  // so raise is reduced to 1 set here - press stays at the full 2. This is the confirmed pattern
  // (Shoulders+Chest / Shoulders+Back example): the second exercise touching an already-covered
  // muscle absorbs the reduction, not the first.
  function shoulderExercises(count: number): ProgramExercise[] {
    return count === 2
      ? [make(db, "shoulder_press"), make(db, "shoulder_raise", undefined, 1)]
      : [make(db, "shoulder_raise", ["shoulder_press", "shoulder_raise"])];
  }
  function armsExercises(count: number): ProgramExercise[] {
    return count === 2 ? [make(db, "biceps"), make(db, "triceps")] : [make(db, "biceps", ["biceps", "triceps"])];
  }
  function exercisesFor(cat: Priority): ProgramExercise[] {
    if (cat === "chest") return chestExercises();
    if (cat === "back") return backExercises(backCount);
    if (cat === "shoulders") return shoulderExercises(shoulderCount);
    return armsExercises(armsCount);
  }

  const items: ProgramExercise[] = [];
  const placed = new Set<Priority>();

  items.push(...exercisesFor(p1));
  placed.add(p1);

  if (p2) {
    items.push(...exercisesFor(p2));
    placed.add(p2);
  }

  (["chest", "back", "shoulders", "arms"] as Priority[]).forEach(cat => {
    if (!placed.has(cat)) items.push(...exercisesFor(cat));
  });

  return items;
}

// Confirmed resolution for [back,arms] and [shoulders,arms]: Arms (priority 2) is guaranteed
// both biceps and triceps, which pushes the total to 6. Shoulders gives up exactly one exercise
// to bring it back to 5 - for back+arms that means Shoulders drops entirely (it was only ever
// going to be a 1-exercise default here); for shoulders+arms it means Shoulders keeps only one
// exercise, fixed to press (no raise option) - confirmed. Chest is fixed to press with no fly
// option in both cases - there's no shoulder-press reason to prefer fly once Shoulders' count
// has been reduced.
function buildBackOrShouldersPlusArmsOverflow(db: Exercise[], p1: Priority): ProgramExercise[] {
  const items: ProgramExercise[] = [];
  if (p1 === "back") {
    items.push(make(db, "back_lat"), make(db, "back_trap")); // priority 1, full 2
    items.push(make(db, "biceps"), make(db, "triceps")); // priority 2 (arms), guaranteed 2
    items.push(make(db, "chest_press")); // fixed press, no fly swap
    // Shoulders omitted entirely.
  } else {
    items.push(make(db, "shoulder_press")); // priority 1, reduced 2 -> 1, fixed to press, no raise option
    items.push(make(db, "biceps"), make(db, "triceps")); // priority 2 (arms), guaranteed 2
    items.push(make(db, "chest_press")); // fixed press, no fly swap
    items.push(makeRowChoice(db)); // back, normal single-slot default
  }
  return items;
}

// Upper-focus: fixed 3-exercise lower block. Calves leads (locally, within the leg group).
function buildFullBodyUpperFocusLower(db: Exercise[]): ProgramExercise[] {
  return [make(db, "calves"), make(db, "quad_isolation"), make(db, "posterior_compound")];
}

// Lower-focus (priority 1 is legs/glutes): 5 lower exercises, calves always leads. Four distinct,
// order-sensitive sequences, each confirmed explicitly. Volume cap: a muscle group maxes at 3
// sets/session, so wherever two exercises share a bucket (glutes: Hip Thrust + Abduction;
// hamstrings: Leg Curl + the RDL/SLDL compound choice), the second one is reduced to 1 set -
// same pattern as the confirmed Shoulders fix.
function buildFullBodyLowerFocusLower(db: Exercise[], priorities: Priority[]): ProgramExercise[] {
  const hasLegs = priorities.includes("legs");
  const hasGlutes = priorities.includes("glutes");

  if (hasLegs && hasGlutes) {
    if (priorities[0] === "glutes") {
      // [glutes, legs]: Calves -> Hip thrust -> Abduction (1 set) -> Leg extension -> SLDL/45
      return [make(db, "calves"), make(db, "glute_priority"), make(db, "abduction", undefined, 1), make(db, "quad_isolation"), make(db, "posterior_compound")];
    }
    // [legs, glutes]: Calves -> Leg extension -> Leg curl -> Hip thrust -> Adductor
    return [make(db, "calves"), make(db, "quad_isolation"), make(db, "hamstring_isolation"), make(db, "glute_priority"), make(db, "adduction")];
  }
  if (hasGlutes) {
    // Glutes alone: Calves -> Hip thrust -> Abduction (1 set) -> Leg curl -> Leg extension
    return [make(db, "calves"), make(db, "glute_priority"), make(db, "abduction", undefined, 1), make(db, "hamstring_isolation"), make(db, "quad_isolation")];
  }
  // Legs alone: Calves -> Leg extension -> Leg curl -> compound choice (1 set, RDL/SLDL/45 or leg press/squat) -> Adductor
  return [
    make(db, "calves"),
    make(db, "quad_isolation"),
    make(db, "hamstring_isolation"),
    make(db, "posterior_compound", ["posterior_compound", "quad_compound"], 1),
    make(db, "adduction")
  ];
}

// Lower-focus: fixed 3-exercise upper block, identical across all lower-focus scenarios. No arms.
function buildFullBodyLowerFocusUpper(db: Exercise[]): ProgramExercise[] {
  return [
    make(db, "chest_press"), // "chest press" specifically - normal same-group swap only, no fly option here
    makeRowChoice(db),
    make(db, "shoulder_raise", ["shoulder_press", "shoulder_raise"])
  ];
}

function buildFullBodyWorkout(db: Exercise[], priorities: Priority[]): ProgramExercise[] {
  if (priorities.length === 0) return buildFullBodyNone(db);
  const isUpperFocus = UPPER_CATEGORIES.has(priorities[0]);
  if (isUpperFocus) {
    return [...buildFullBodyUpperFocusUpper(db, priorities), ...buildFullBodyUpperFocusLower(db)];
  }
  return [...buildFullBodyLowerFocusLower(db, priorities), ...buildFullBodyLowerFocusUpper(db)];
}

// ============================================================================
// UPPER/LOWER (4 day) - Upper day uses the plain, unconstrained defaults (6 exercises: chest,
// lat, trap, shoulder, bicep, tricep by default). No 8-cap, no triceps-cutting - that's Full
// Body-only. Lower day: calves-led, capped at 5, per rule 3/4 (now also carrying Abduction).
// ============================================================================

function addRole(out: ProgramExercise[], db: Exercise[], role: string) {
  out.push(make(db, role));
}

function addPriorityBlock(out: ProgramExercise[], db: Exercise[], priority: Priority) {
  switch (priority) {
    case "chest":
      addRole(out, db, "chest_press");
      break;
    case "back":
      addRole(out, db, "back_lat");
      addRole(out, db, "back_trap");
      break;
    case "shoulders":
      addRole(out, db, "shoulder_raise");
      break;
    case "arms":
      addRole(out, db, "biceps");
      addRole(out, db, "triceps");
      break;
    case "legs":
    case "glutes":
      // Handled separately via pickUpperLowerLegBlock - never a per-priority push.
      break;
  }
}

function addNonPriorityDefaults(out: ProgramExercise[], db: Exercise[], priorities: Priority[]) {
  const p = new Set(priorities);
  if (!p.has("chest")) addRole(out, db, "chest_press");
  if (!p.has("back")) { addRole(out, db, "back_lat"); addRole(out, db, "back_trap"); }
  if (!p.has("shoulders")) addRole(out, db, "shoulder_raise");
  if (!p.has("arms")) { addRole(out, db, "biceps"); addRole(out, db, "triceps"); }
}

function buildUpperLowerLegsTemplate(db: Exercise[]): ProgramExercise[] {
  return [
    make(db, "calves"),
    make(db, "quad_isolation"),
    make(db, "hamstring_isolation"),
    make(db, "posterior_compound", ["posterior_compound", "quad_compound"], 1), // 1 set exception
    make(db, "adduction")
  ];
}
function buildUpperLowerGlutesTemplate(db: Exercise[]): ProgramExercise[] {
  // Volume cap: glutes maxes at 3 sets/session (Hip Thrust 2 + Abduction 1).
  return [make(db, "calves"), make(db, "glute_priority"), make(db, "abduction", undefined, 1), make(db, "hamstring_isolation"), make(db, "quad_isolation")];
}
function buildUpperLowerLegsGlutesTemplate(db: Exercise[]): ProgramExercise[] {
  // [legs, glutes]
  return [make(db, "calves"), make(db, "quad_isolation"), make(db, "hamstring_isolation"), make(db, "glute_priority"), make(db, "adduction")];
}
function buildUpperLowerGlutesLegsTemplate(db: Exercise[]): ProgramExercise[] {
  // [glutes, legs] - volume cap: glutes maxes at 3 sets/session (Hip Thrust 2 + Abduction 1).
  return [make(db, "calves"), make(db, "glute_priority"), make(db, "abduction", undefined, 1), make(db, "quad_isolation"), make(db, "posterior_compound")];
}

function pickUpperLowerLegBlock(db: Exercise[], priorities: Priority[]): ProgramExercise[] {
  const hasLegs = priorities.includes("legs");
  const hasGlutes = priorities.includes("glutes");
  if (hasLegs && hasGlutes) {
    return priorities[0] === "glutes" ? buildUpperLowerGlutesLegsTemplate(db) : buildUpperLowerLegsGlutesTemplate(db);
  }
  if (hasGlutes) return buildUpperLowerGlutesTemplate(db);
  return buildUpperLowerLegsTemplate(db); // legs-only, or the default when neither is a priority
}

function validatePriorities(priorities: Priority[]) {
  if (priorities.length > 2) throw new Error("Select up to 2 priority muscles.");
  const valid = new Set(["chest", "back", "shoulders", "arms", "legs", "glutes"]);
  if (priorities.some(p => !valid.has(p))) throw new Error("Invalid priority.");
  if (new Set(priorities).size !== priorities.length) throw new Error("Duplicate priority.");
}

export function generateProgram(trainingDays: 2 | 3 | 4, priorities: Priority[], db: Exercise[]): Program {
  validatePriorities(priorities);
  const split: Split = trainingDays === 4 ? "upper_lower_4" : trainingDays === 3 ? "full_body_3" : "full_body_2";
  const isFull = split !== "upper_lower_4";

  let workout: ProgramExercise[];
  if (isFull) {
    workout = buildFullBodyWorkout(db, priorities);
  } else {
    const out: ProgramExercise[] = [];
    priorities.forEach(p => addPriorityBlock(out, db, p));
    addNonPriorityDefaults(out, db, priorities);
    out.push(...pickUpperLowerLegBlock(db, priorities));
    const seen = new Set<string>();
    workout = out.filter(x => !seen.has(x.exerciseId) && (seen.add(x.exerciseId), true));
  }

  const workouts: Record<string, ProgramExercise[]> = isFull
    ? { "Full Body A": workout }
    : {
        "Upper A": workout.filter(x => !["quad_isolation", "posterior_compound", "glute_priority", "hamstring_isolation", "calves", "adduction", "abduction"].includes(x.programmingRole)),
        "Lower A": workout.filter(x => ["quad_isolation", "posterior_compound", "glute_priority", "hamstring_isolation", "calves", "adduction", "abduction"].includes(x.programmingRole))
      };

  return { trainingDays, split, priorities, workouts };
}

export function getRIR(week: number): string {
  if (!Number.isInteger(week) || week < 1 || week > 8) throw new Error("Week must be 1-8.");
  return RIR[week];
}

export function getSubstitutions(current: Exercise, db: Exercise[]): Exercise[] {
  return db.filter(e => e.active && e.substitution_group === current.substitution_group && e.exercise_id !== current.exercise_id);
}

// Use this (instead of getSubstitutions) when swapping a ProgramExercise from a generated program.
// Normal slots keep the same-substitutionGroup rule. Slots with a confirmed scoped exception
// (swapRoles set) instead offer exercises from their approved list.
export function getSwapOptions(current: ProgramExercise, db: Exercise[]): Exercise[] {
  if (current.swapRoles) {
    return db.filter(e =>
      e.active &&
      current.swapRoles!.includes(e.programming_role) &&
      (!current.swapMovementPattern || e.movement_pattern === current.swapMovementPattern) &&
      e.exercise_id !== current.exerciseId
    );
  }
  return db.filter(e => e.active && e.substitution_group === current.substitutionGroup && e.exercise_id !== current.exerciseId);
}
