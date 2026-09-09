import { generateProgram, getRIR, getSwapOptions, Exercise } from "../lib/programGenerator";
import { applySwap } from "../lib/applySwap";
import exercisesRaw from "../lib/exercises.json";

const exercises = exercisesRaw as unknown as Exercise[];
const ids = (arr: any[]) => arr.map(x => x.exerciseId);
const rawIds = (arr: any[]) => arr.map(x => x.exercise_id);

function assertEqual(a: any, b: any, msg = "") {
  const as = JSON.stringify(a), bs = JSON.stringify(b);
  if (as !== bs) throw new Error(`${msg} expected ${bs}, got ${as}`);
}
function assertThrows(fn: () => void) {
  try { fn(); throw new Error("did not throw"); } catch (e: any) { if (e.message === "did not throw") throw e; }
}

// --- Core validation ---
test("RIR schedule", () => {
  assertEqual(getRIR(1), "1-2"); assertEqual(getRIR(5), "1"); assertEqual(getRIR(6), "0"); assertEqual(getRIR(8), "0");
});
test("Rejects invalid/duplicate priorities, allows 0-2", () => {
  assertThrows(() => generateProgram(3, ["nope"] as any, exercises));
  assertThrows(() => generateProgram(3, ["chest","chest"], exercises));
  assertThrows(() => generateProgram(3, ["chest","back","legs"] as any, exercises));
  generateProgram(3, [], exercises); // should NOT throw - "None" is valid
});
test("adductor and abductor exercises both exist", () => {
  assertEqual(exercises.some(e => e.programming_role === "adduction"), true);
  assertEqual(exercises.some(e => e.programming_role === "abduction"), true);
});

// --- Full Body: None ---
test("None: confirmed 7-exercise sequence", () => {
  const p = generateProgram(3, [], exercises);
  assertEqual(ids(p.workouts["Full Body A"]), ["Chest001","Back002","Shoulder004","Bicep001","Calves001","Quad001","Leg002"]);
});
test("None: chest/shoulder/bicep all freely swappable", () => {
  const p = generateProgram(3, [], exercises);
  const chest = p.workouts["Full Body A"].find(x => x.exerciseId === "Chest001")!;
  const shoulder = p.workouts["Full Body A"].find(x => x.exerciseId === "Shoulder004")!;
  const bicep = p.workouts["Full Body A"].find(x => x.exerciseId === "Bicep001")!;
  assertEqual(rawIds(getSwapOptions(chest, exercises)).sort(), ["Chest002","Chest003"].sort());
  assertEqual(rawIds(getSwapOptions(shoulder, exercises)).sort(), ["Shoulder001","Shoulder002","Shoulder005","Shoulder006"].sort());
  assertEqual(rawIds(getSwapOptions(bicep, exercises)), ["Tricep001"]);
});

// --- Full Body: upper-focus, both explicitly-given examples verbatim ---
test("CONFIRMED: [shoulders,chest] = press, raise, fly, row-tucked, biceps", () => {
  const p = generateProgram(3, ["shoulders","chest"], exercises);
  assertEqual(ids(p.workouts["Full Body A"]), ["Shoulder001","Shoulder004","Chest003","Back002","Bicep001","Calves001","Quad001","Leg002"]);
});
test("CONFIRMED: [back,chest] = pulldown, row-flared, chest-press, shoulder-raise, biceps", () => {
  const p = generateProgram(3, ["back","chest"], exercises);
  assertEqual(ids(p.workouts["Full Body A"]), ["Back001","Back004","Chest001","Shoulder004","Bicep001","Calves001","Quad001","Leg002"]);
});

// --- Full Body: upper-focus derived combos, all at exactly 8 ---
test("Every upper-focus scenario hits exactly 8 exercises", () => {
  const scenarios: string[][] = [
    ["chest"],["back"],["shoulders"],["arms"],
    ["chest","back"],["chest","shoulders"],["chest","arms"],["arms","chest"],
    ["back","arms"],["arms","back"],["shoulders","arms"],["arms","shoulders"],
    ["back","shoulders"],["shoulders","back"]
  ];
  scenarios.forEach(pri => {
    const p = generateProgram(3, pri as any, exercises);
    assertEqual(p.workouts["Full Body A"].length, 8, pri.join("+"));
  });
});
test("Chest-alone: back defaults to row (merged single slot), never doubles chest", () => {
  const p = generateProgram(3, ["chest"], exercises);
  const roles = p.workouts["Full Body A"].map(x => x.programmingRole);
  assertEqual(roles.filter(r => r === "chest_press" || r === "chest_fly").length, 1);
  const back = p.workouts["Full Body A"].find(x => x.exerciseId === "Back002");
  assertEqual(!!back, true);
});
test("Back-alone / Shoulders-alone: triceps dropped, shoulder/back both kept (not the old drop-shoulder rule)", () => {
  ["back","shoulders"].forEach(pri => {
    const p = generateProgram(3, [pri] as any, exercises);
    const roles = p.workouts["Full Body A"].map(x => x.programmingRole);
    assertEqual(roles.includes("triceps"), false, pri);
    assertEqual(roles.includes("shoulder_press") || roles.includes("shoulder_raise"), true, pri);
    assertEqual(roles.includes("back_lat") || roles.includes("back_trap"), true, pri);
  });
});
test("Arms-alone / Arms-as-priority-1: always protected at 2 (both biceps+triceps)", () => {
  ["arms"].forEach(() => {
    const p = generateProgram(3, ["arms"], exercises);
    const roles = p.workouts["Full Body A"].map(x => x.programmingRole);
    assertEqual(roles.includes("biceps") && roles.includes("triceps"), true);
  });
});
test("Chest+Arms / Arms+Chest: no cut needed, both biceps+triceps present", () => {
  [["chest","arms"],["arms","chest"]].forEach(pri => {
    const p = generateProgram(3, pri as any, exercises);
    const roles = p.workouts["Full Body A"].map(x => x.programmingRole);
    assertEqual(roles.includes("biceps") && roles.includes("triceps"), true, pri.join("+"));
  });
});
// NOTE: the old "Back+Arms / Shoulders+Arms: triceps cut" test that lived here was superseded by
// the "REVISED" tests at the bottom of this file - arms-as-priority-2 now guarantees both
// biceps+triceps, and Shoulders gives up an exercise instead. See those tests for current behavior.
test("Arms+Back / Arms+Shoulders (arms as priority 1): protected, triceps NOT cut", () => {
  [["arms","back"],["arms","shoulders"]].forEach(pri => {
    const p = generateProgram(3, pri as any, exercises);
    const roles = p.workouts["Full Body A"].map(x => x.programmingRole);
    assertEqual(roles.includes("biceps") && roles.includes("triceps"), true, pri.join("+"));
  });
});
test("Chest defaults to fly only when Shoulders is priority 1", () => {
  const withShoulders = generateProgram(3, ["shoulders","chest"], exercises);
  const chestA = withShoulders.workouts["Full Body A"].find(x => x.programmingRole === "chest_fly" || x.programmingRole === "chest_press")!;
  assertEqual(chestA.programmingRole, "chest_fly");

  const withBack = generateProgram(3, ["back","chest"], exercises);
  const chestB = withBack.workouts["Full Body A"].find(x => x.programmingRole === "chest_fly" || x.programmingRole === "chest_press")!;
  assertEqual(chestB.programmingRole, "chest_press");
});
test("Chest/shoulder swaps are independent, not linked (retired pairing)", () => {
  const p = generateProgram(3, ["chest"], exercises);
  const chest = p.workouts["Full Body A"].find(x => x.programmingRole === "chest_press")!;
  const chestFly = getSwapOptions(chest, exercises).find(e => e.programming_role === "chest_fly")!;
  const after = applySwap(p.workouts["Full Body A"], chest.exerciseId, chestFly);
  const shoulder = after.find(x => x.programmingRole === "shoulder_press" || x.programmingRole === "shoulder_raise")!;
  assertEqual(shoulder.programmingRole, "shoulder_raise"); // unchanged - no cascade
});

// --- Full Body: lower-focus, all 4 explicitly-given sequences verbatim ---
test("CONFIRMED: Legs alone = calves > ext > curl > compound(1s,swap) > adductor + fixed 3 upper (volume cap: hamstrings 2+1=3)", () => {
  const p = generateProgram(3, ["legs"], exercises);
  assertEqual(ids(p.workouts["Full Body A"]), ["Calves001","Quad001","Ham001","Leg002","Adduct001","Chest001","Back002","Shoulder004"]);
  const compound = p.workouts["Full Body A"].find(x => x.exerciseId === "Leg002")!;
  assertEqual(compound.sets, 1);
  assertEqual(rawIds(getSwapOptions(compound, exercises)), ["Leg001"]);
});
test("CONFIRMED: Glutes alone = calves > hipthrust > abduction(1s) > curl > ext + fixed 3 upper (volume cap: glutes 2+1=3)", () => {
  const p = generateProgram(3, ["glutes"], exercises);
  assertEqual(ids(p.workouts["Full Body A"]), ["Calves001","Glutes001","Abduct001","Ham001","Quad001","Chest001","Back002","Shoulder004"]);
  const abduction = p.workouts["Full Body A"].find(x => x.exerciseId === "Abduct001")!;
  assertEqual(abduction.sets, 1);
});
test("CONFIRMED: [legs,glutes] = calves > ext > curl > hipthrust > adductor + fixed 3 upper (no doubling, unaffected)", () => {
  const p = generateProgram(3, ["legs","glutes"], exercises);
  assertEqual(ids(p.workouts["Full Body A"]), ["Calves001","Quad001","Ham001","Glutes001","Adduct001","Chest001","Back002","Shoulder004"]);
});
test("CONFIRMED: [glutes,legs] = calves > hipthrust > abduction(1s) > ext > RDL + fixed 3 upper (volume cap: glutes 2+1=3)", () => {
  const p = generateProgram(3, ["glutes","legs"], exercises);
  assertEqual(ids(p.workouts["Full Body A"]), ["Calves001","Glutes001","Abduct001","Quad001","Leg002","Chest001","Back002","Shoulder004"]);
  const abduction = p.workouts["Full Body A"].find(x => x.exerciseId === "Abduct001")!;
  assertEqual(abduction.sets, 1);
});
test("Lower-focus upper block: chest press has NO fly option (unlike upper-focus contexts)", () => {
  const p = generateProgram(3, ["legs"], exercises);
  const chest = p.workouts["Full Body A"].find(x => x.exerciseId === "Chest001")!;
  assertEqual(chest.swapRoles, undefined);
  assertEqual(rawIds(getSwapOptions(chest, exercises)), ["Chest002"]);
});
test("Lower-focus upper block has zero arm exercises", () => {
  ["legs","glutes"].forEach(pri => {
    const p = generateProgram(3, [pri] as any, exercises);
    const roles = p.workouts["Full Body A"].map(x => x.programmingRole);
    assertEqual(roles.includes("biceps") || roles.includes("triceps"), false, pri);
  });
});
test("Calves always leads the ENTIRE sequence in lower-focus scenarios", () => {
  ["legs","glutes"].forEach(pri => {
    const p = generateProgram(3, [pri] as any, exercises);
    assertEqual(p.workouts["Full Body A"][0].exerciseId, "Calves001", pri);
  });
  [["legs","glutes"],["glutes","legs"]].forEach(pri => {
    const p = generateProgram(3, pri as any, exercises);
    assertEqual(p.workouts["Full Body A"][0].exerciseId, "Calves001", pri.join("+"));
  });
});

// --- Muscle-group volume cap: 3 sets/session maximum ---
test("VOLUME CAP: shoulders never exceeds 3 sets/session (press 2 + raise 1) - your exact example", () => {
  [["shoulders"],["shoulders","chest"],["shoulders","back"]].forEach(pri => {
    const p = generateProgram(3, pri as any, exercises);
    const press = p.workouts["Full Body A"].find(x => x.programmingRole === "shoulder_press")!;
    const raise = p.workouts["Full Body A"].find(x => x.programmingRole === "shoulder_raise")!;
    assertEqual(press.sets, 2, pri.join("+"));
    assertEqual(raise.sets, 1, pri.join("+"));
  });
});
test("VOLUME CAP: [shoulders,arms] shoulder is fixed to press (no raise option at all)", () => {
  const p = generateProgram(3, ["shoulders","arms"], exercises);
  const shoulder = p.workouts["Full Body A"].find(x => x.programmingRole === "shoulder_press" || x.programmingRole === "shoulder_raise")!;
  assertEqual(shoulder.programmingRole, "shoulder_press");
  assertEqual(shoulder.swapRoles, undefined);
});
test("VOLUME CAP: no muscle group ever exceeds 3 sets/session, across every scenario and both splits", () => {
  const BUCKET: Record<string,string> = {
    chest_press: "chest", chest_fly: "chest", back_lat: "lats", back_trap: "traps",
    shoulder_press: "shoulders", shoulder_raise: "shoulders", biceps: "biceps", triceps: "triceps",
    quad_isolation: "quads", quad_compound: "quads", hamstring_isolation: "hamstrings",
    posterior_compound: "hamstrings", glute_priority: "glutes", abduction: "glutes",
    calves: "calves", adduction: "adductors"
  };
  const fullBodyScenarios: string[][] = [["chest"],["back"],["shoulders"],["arms"],["chest","back"],["chest","shoulders"],["shoulders","chest"],["chest","arms"],["arms","chest"],["back","arms"],["arms","back"],["shoulders","arms"],["arms","shoulders"],["back","shoulders"],["shoulders","back"],["legs"],["glutes"],["legs","glutes"],["glutes","legs"],[]];
  fullBodyScenarios.forEach(pri => {
    [2,3].forEach(days => {
      const p = generateProgram(days as 2|3, pri as any, exercises);
      const totals: Record<string, number> = {};
      p.workouts["Full Body A"].forEach(x => { const b = BUCKET[x.programmingRole]; totals[b] = (totals[b]||0) + x.sets; });
      Object.entries(totals).forEach(([bucket, sets]) => assertEqual(sets <= 3, true, `${days}d [${pri.join("+")}] ${bucket}=${sets}`));
    });
  });
  const upperLowerScenarios: string[][] = [["legs"],["glutes"],["legs","glutes"],["glutes","legs"]];
  upperLowerScenarios.forEach(pri => {
    const p = generateProgram(4, pri as any, exercises);
    const totals: Record<string, number> = {};
    p.workouts["Lower A"].forEach(x => { const b = BUCKET[x.programmingRole]; totals[b] = (totals[b]||0) + x.sets; });
    Object.entries(totals).forEach(([bucket, sets]) => assertEqual(sets <= 3, true, `UL [${pri.join("+")}] ${bucket}=${sets}`));
  });
});
test("Calves only leads the LOCAL leg group in upper-focus scenarios (not the whole sequence)", () => {
  const p = generateProgram(3, ["chest"], exercises);
  assertEqual(p.workouts["Full Body A"][0].exerciseId, "Chest001"); // not calves
  const calvesIdx = ids(p.workouts["Full Body A"]).indexOf("Calves001");
  assertEqual(calvesIdx, 5); // leads the 3-exercise lower block specifically (position 6 of 8)
});
test("Every lower-focus scenario hits exactly 8 (5 lower + 3 upper)", () => {
  [["legs"],["glutes"],["legs","glutes"],["glutes","legs"]].forEach(pri => {
    const p = generateProgram(3, pri as any, exercises);
    assertEqual(p.workouts["Full Body A"].length, 8, pri.join("+"));
  });
});

// --- 2-day Full Body sanity (same rules, different split) ---
test("2-day Full Body follows the same rules as 3-day", () => {
  const p2 = generateProgram(2, ["chest"], exercises);
  const p3 = generateProgram(3, ["chest"], exercises);
  assertEqual(ids(p2.workouts["Full Body A"]), ids(p3.workouts["Full Body A"]));
});

// --- Upper/Lower: confirmed unaffected (Upper day) ---
test("Upper/Lower Upper day is unconstrained: 6 exercises, chest/lat/trap/shoulder/bicep/tricep", () => {
  const p = generateProgram(4, ["chest"], exercises);
  assertEqual(p.workouts["Upper A"].length, 6);
  const roles = p.workouts["Upper A"].map(x => x.programmingRole);
  assertEqual(roles.includes("triceps"), true); // never cut on Upper/Lower
});
test("Upper/Lower Upper day has the same 6 roles regardless of scenario (never touched by Full Body rules)", () => {
  const scenarios: string[][] = [["chest"],["back"],["legs"],["glutes"],["legs","glutes"]];
  const roleSets = scenarios.map(pri => generateProgram(4, pri as any, exercises).workouts["Upper A"].map(x => x.programmingRole).sort());
  roleSets.forEach(r => assertEqual(r, roleSets[0]));
});

// --- Upper/Lower: Lower day updated per rule 3/4 ---
test("Upper/Lower Lower day: legs-alone unchanged (calves>ext>curl>compound(1s)>adductor)", () => {
  const p = generateProgram(4, ["legs"], exercises);
  assertEqual(ids(p.workouts["Lower A"]), ["Calves001","Quad001","Ham001","Leg002","Adduct001"]);
  assertEqual(p.workouts["Lower A"].find(x => x.exerciseId === "Leg002")!.sets, 1);
});
test("Upper/Lower Lower day: glutes-alone now includes Abduction (volume cap: 1 set)", () => {
  const p = generateProgram(4, ["glutes"], exercises);
  assertEqual(ids(p.workouts["Lower A"]), ["Calves001","Glutes001","Abduct001","Ham001","Quad001"]);
  assertEqual(p.workouts["Lower A"].find(x => x.exerciseId === "Abduct001")!.sets, 1);
});
test("Upper/Lower Lower day: [legs,glutes] matches Full Body's version exactly", () => {
  const p = generateProgram(4, ["legs","glutes"], exercises);
  assertEqual(ids(p.workouts["Lower A"]), ["Calves001","Quad001","Ham001","Glutes001","Adduct001"]);
});
test("Upper/Lower Lower day: [glutes,legs] matches Full Body's version exactly (volume cap: abduction 1 set)", () => {
  const p = generateProgram(4, ["glutes","legs"], exercises);
  assertEqual(ids(p.workouts["Lower A"]), ["Calves001","Glutes001","Abduct001","Quad001","Leg002"]);
  assertEqual(p.workouts["Lower A"].find(x => x.exerciseId === "Abduct001")!.sets, 1);
});
test("Every Upper/Lower Lower day is exactly 5 exercises, calves first", () => {
  [["legs"],["glutes"],["chest"],["legs","glutes"],["glutes","legs"]].forEach(pri => {
    const p = generateProgram(4, pri as any, exercises);
    assertEqual(p.workouts["Lower A"].length, 5, pri.join("+"));
    assertEqual(p.workouts["Lower A"][0].exerciseId, "Calves001", pri.join("+"));
  });
});

// --- Final arms revision: arms-as-priority-2 always protected (both biceps+triceps) ---
test("REVISED: [back,arms] and [shoulders,arms] now guarantee both biceps+triceps", () => {
  [["back","arms"],["shoulders","arms"]].forEach(pri => {
    const p = generateProgram(3, pri as any, exercises);
    const roles = p.workouts["Full Body A"].map(x => x.programmingRole);
    assertEqual(roles.includes("biceps") && roles.includes("triceps"), true, pri.join("+"));
    assertEqual(p.workouts["Full Body A"].length, 8, pri.join("+"));
  });
});
test("REVISED: [back,arms] drops shoulders entirely to make room", () => {
  const p = generateProgram(3, ["back","arms"], exercises);
  const roles = p.workouts["Full Body A"].map(x => x.programmingRole);
  assertEqual(roles.includes("shoulder_press") || roles.includes("shoulder_raise"), false);
});
test("REVISED: [shoulders,arms] keeps exactly 1 shoulder exercise (not 2, not 0)", () => {
  const p = generateProgram(3, ["shoulders","arms"], exercises);
  const roles = p.workouts["Full Body A"].map(x => x.programmingRole);
  const shoulderCount = roles.filter(r => r === "shoulder_press" || r === "shoulder_raise").length;
  assertEqual(shoulderCount, 1);
});
test("REVISED: chest is fixed to press with no fly option in both overflow combos", () => {
  [["back","arms"],["shoulders","arms"]].forEach(pri => {
    const p = generateProgram(3, pri as any, exercises);
    const chest = p.workouts["Full Body A"].find(x => x.programmingRole === "chest_press")!;
    assertEqual(chest.swapRoles, undefined, pri.join("+"));
    assertEqual(rawIds(getSwapOptions(chest, exercises)), ["Chest002"], pri.join("+"));
  });
});
test("REVISED: arms-as-priority-1 combos (arms+back, arms+shoulders) unaffected - still hit 5/8", () => {
  [["arms","back"],["arms","shoulders"]].forEach(pri => {
    const p = generateProgram(3, pri as any, exercises);
    assertEqual(p.workouts["Full Body A"].length, 8, pri.join("+"));
    const roles = p.workouts["Full Body A"].map(x => x.programmingRole);
    assertEqual(roles.includes("biceps") && roles.includes("triceps"), true, pri.join("+"));
  });
});
test("REVISED: Back-alone / Shoulders-alone still cut triceps (arms not selected, unaffected)", () => {
  ["back","shoulders"].forEach(pri => {
    const p = generateProgram(3, [pri] as any, exercises);
    const roles = p.workouts["Full Body A"].map(x => x.programmingRole);
    assertEqual(roles.includes("biceps"), true, pri);
    assertEqual(roles.includes("triceps"), false, pri);
  });
});
test("REVISED: every upper-focus scenario still hits exactly 8", () => {
  const scenarios: string[][] = [["chest"],["back"],["shoulders"],["arms"],["chest","back"],["chest","shoulders"],["chest","arms"],["arms","chest"],["back","arms"],["arms","back"],["shoulders","arms"],["arms","shoulders"],["back","shoulders"],["shoulders","back"]];
  scenarios.forEach(pri => assertEqual(generateProgram(3, pri as any, exercises).workouts["Full Body A"].length, 8, pri.join("+")));
});
test("REVISED: Upper/Lower entirely untouched by this change", () => {
  assertEqual(generateProgram(4, ["back","arms"], exercises).workouts["Upper A"].length, 6);
  const ulRoles = generateProgram(4, ["back","arms"], exercises).workouts["Upper A"].map(x => x.programmingRole);
  assertEqual(ulRoles.includes("triceps"), true, "Upper/Lower never cuts triceps regardless");
});
