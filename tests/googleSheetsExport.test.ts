import { buildProgramRows } from "../lib/googleSheetsExport";
import { Program, ProgramExercise } from "../lib/programGenerator";

function ex(name: string, sets: number, repMin: number, repMax: number): ProgramExercise {
  return {
    exerciseId: name,
    exerciseName: name,
    sets,
    repMin,
    repMax,
    programmingRole: "test",
    substitutionGroup: "test"
  };
}

test("buildProgramRows includes summary block with split, days, and priority", () => {
  const program: Program = { trainingDays: 3, split: "full_body_3", priorities: ["chest"], workouts: {} };
  const rows = buildProgramRows(program, { "Full Body A": [ex("Chest Press", 2, 6, 10)] });

  expect(rows[0]).toEqual(["Program Summary"]);
  expect(rows[1]).toEqual(["Split", "Full Body"]);
  expect(rows[2]).toEqual(["Training days", "3 / week"]);
  expect(rows[3]).toEqual(["Priority", "Chest"]);
});

test("buildProgramRows labels Upper/Lower split correctly", () => {
  const program: Program = { trainingDays: 4, split: "upper_lower_4", priorities: ["legs"], workouts: {} };
  const rows = buildProgramRows(program, { "Upper A": [], "Lower A": [] });
  expect(rows[1]).toEqual(["Split", "Upper / Lower"]);
});

test("buildProgramRows shows 'None' when no priorities selected", () => {
  const program: Program = { trainingDays: 3, split: "full_body_3", priorities: [], workouts: {} };
  const rows = buildProgramRows(program, { "Full Body A": [] });
  expect(rows[3]).toEqual(["Priority", "None"]);
});

test("buildProgramRows joins multiple priorities with '+' and capitalizes them", () => {
  const program: Program = { trainingDays: 3, split: "full_body_3", priorities: ["legs", "glutes"], workouts: {} };
  const rows = buildProgramRows(program, { "Full Body A": [] });
  expect(rows[3]).toEqual(["Priority", "Legs + Glutes"]);
});

test("buildProgramRows writes one day-header, one column-header, and one row per exercise", () => {
  const program: Program = { trainingDays: 3, split: "full_body_3", priorities: ["chest"], workouts: {} };
  const rows = buildProgramRows(program, {
    "Full Body A": [ex("Chest Press", 2, 6, 10), ex("Leg Curl", 2, 6, 10)]
  });

  const dayHeaderIdx = rows.findIndex((r) => r[0] === "Full Body A");
  expect(dayHeaderIdx).toBeGreaterThan(-1);
  expect(rows[dayHeaderIdx + 1]).toEqual(["#", "Exercise", "Sets", "Reps"]);
  expect(rows[dayHeaderIdx + 2]).toEqual(["1", "Chest Press", "2", "6-10"]);
  expect(rows[dayHeaderIdx + 3]).toEqual(["2", "Leg Curl", "2", "6-10"]);
});

test("buildProgramRows writes a section per workout day, in order, for Upper/Lower", () => {
  const program: Program = { trainingDays: 4, split: "upper_lower_4", priorities: ["chest"], workouts: {} };
  const rows = buildProgramRows(program, {
    "Upper A": [ex("Chest Press", 2, 6, 10)],
    "Lower A": [ex("Calf Raise", 2, 6, 10)]
  });

  const upperIdx = rows.findIndex((r) => r[0] === "Upper A");
  const lowerIdx = rows.findIndex((r) => r[0] === "Lower A");
  expect(upperIdx).toBeGreaterThan(-1);
  expect(lowerIdx).toBeGreaterThan(upperIdx);
});

test("buildProgramRows separates sections with a blank row", () => {
  const program: Program = { trainingDays: 3, split: "full_body_3", priorities: ["chest"], workouts: {} };
  const rows = buildProgramRows(program, { "Full Body A": [ex("Chest Press", 2, 6, 10)] });
  expect(rows[4]).toEqual([]); // blank row after the summary block, before the first day section
});
