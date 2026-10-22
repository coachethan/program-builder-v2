import { generateProgram, getRIR, Exercise, Program, ProgramExercise } from "../lib/programGenerator";
import exercisesRaw from "../lib/exercises.json";
import {
  BANNER_HEIGHT,
  buildProgramSheet,
  buildProgressColorRequests,
  CellData,
  COLUMN_HEADERS,
  GridRange,
  HOW_TO_1,
  HOW_TO_2,
  PROGRESS_OPTIONS,
  RIR_EXPLANATION,
  ROW_HEIGHT,
  SheetLayout,
  titleFor,
  WEEK_COL_WIDTHS,
  WEEKS,
  weekStartCol
} from "../lib/sheetLayout";

const exercises = exercisesRaw as unknown as Exercise[];

function build(
  program: Program,
  firstName?: string | null,
  workouts?: Record<string, ProgramExercise[]>
): SheetLayout {
  return buildProgramSheet(program, workouts ?? program.workouts, { title: "Test", firstName });
}

function cells(layout: SheetLayout): CellData[][] {
  return layout.spreadsheet.sheets[0].data[0].rowData.map((row) => row.values);
}

function textOf(cell: CellData | undefined): string | undefined {
  return cell?.userEnteredValue?.stringValue;
}

function fullBody(): Program {
  return generateProgram(3, ["chest"], exercises);
}

function upperLower(): Program {
  return generateProgram(4, ["legs"], exercises);
}

test("one tab called Program, and nothing is frozen so the Overview scrolls away", () => {
  const layout = build(fullBody());
  const sheet = layout.spreadsheet.sheets[0];
  expect(layout.spreadsheet.sheets).toHaveLength(1);
  expect(sheet.properties.title).toBe("Program");
  expect(Object.keys(sheet.properties.gridProperties)).toEqual(["rowCount", "columnCount", "hideGridlines"]);
});

test("title uses the first name, and falls back to Your Program", () => {
  expect(textOf(cells(build(fullBody(), "Ethan"))[0][1])).toBe("Ethan\u2019s Program");
  expect(textOf(cells(build(fullBody(), null))[0][1])).toBe("Your Program");
  expect(titleFor("")).toBe("Your Program");
  expect(titleFor("   ")).toBe("Your Program");
});

test("overview wording is exactly as specified", () => {
  expect(HOW_TO_1).toBe("1. Perform the exercises to the prescribed RIR for the week - Intensity (RIR)");
  expect(HOW_TO_2).toBe("2. Log your training - Weight x Reps, RIR (achieved), Notes (if any)");
  expect(RIR_EXPLANATION).toBe(
    "RIR = reps in reserve (no. of clean reps you could have performed with standardized form)"
  );
  const texts: string[] = [];
  cells(build(fullBody())).forEach((row) => {
    const t = textOf(row[1]);
    if (t) texts.push(t);
  });
  expect(texts).toContain(HOW_TO_1);
  expect(texts).toContain(HOW_TO_2);
  expect(texts).toContain(RIR_EXPLANATION);
  expect(texts).toContain("How to use");
  expect(texts).toContain("RIR by week");
});

test("overview shows split, training days and priority, and the RIR by week table", () => {
  const g = cells(build(fullBody()));
  expect([textOf(g[1][1]), textOf(g[1][2])]).toEqual(["Split", "Full Body"]);
  expect([textOf(g[2][1]), textOf(g[2][2])]).toEqual(["Training days", "3 / week"]);
  expect([textOf(g[3][1]), textOf(g[3][2])]).toEqual(["Priority", "Chest"]);
  expect([textOf(g[11][1]), textOf(g[11][2])]).toEqual(["Week 1", "1-2"]);
  expect([textOf(g[12][1]), textOf(g[12][2])]).toEqual(["Weeks 2-5", "1"]);
  expect([textOf(g[13][1]), textOf(g[13][2])]).toEqual(["Weeks 6-8", "0"]);
  const none = cells(build(generateProgram(3, [], exercises)));
  expect(textOf(none[3][2])).toBe("None");
});

test("weeks run left to right on the same row", () => {
  const g = cells(build(fullBody()));
  let previous = -1;
  for (let week = 1; week <= WEEKS; week++) {
    const col = weekStartCol(week);
    expect(textOf(g[0][col])).toBe(`Week ${week}`);
    expect(col).toBeGreaterThan(previous);
    previous = col;
  }
});

test("every week has the columns in the requested order", () => {
  const g = cells(build(fullBody()));
  for (let week = 1; week <= WEEKS; week++) {
    const c0 = weekStartCol(week);
    const header = COLUMN_HEADERS.map((_, i) => textOf(g[2][c0 + i]));
    expect(header).toEqual([
      "Exercise",
      "Sets",
      "Reps",
      "Intensity (RIR)",
      "Weight x Reps",
      "RIR",
      "Progressed Load/Reps?",
      "Notes"
    ]);
  }
});

test("exercise rows are pre-filled; Intensity (RIR) follows the week", () => {
  const program = fullBody();
  const g = cells(build(program));
  const first = program.workouts["Full Body A"][0];
  for (let week = 1; week <= WEEKS; week++) {
    const c0 = weekStartCol(week);
    expect(textOf(g[3][c0])).toBe(first.exerciseName);
    expect(g[3][c0 + 1].userEnteredValue?.numberValue).toBe(first.sets);
    expect(textOf(g[3][c0 + 2])).toBe("6-10");
    expect(textOf(g[3][c0 + 3])).toBe(getRIR(week));
  }
});

test("shaded cells start at Weight x Reps and run through Notes", () => {
  const g = cells(build(fullBody()));
  const c0 = weekStartCol(1);
  for (let i = 0; i < 4; i++) {
    expect(g[3][c0 + i].userEnteredFormat?.backgroundColor.red).toBe(1);
  }
  for (let i = 4; i < 8; i++) {
    const red = g[3][c0 + i].userEnteredFormat?.backgroundColor.red;
    expect(red === undefined ? 1 : red).toBeLessThan(1);
  }
});

test("the Progressed dropdown offers Yes, No and Maintained, and only that column has it", () => {
  const g = cells(build(fullBody()));
  let dropdowns = 0;
  g.forEach((row) =>
    row.forEach((cell) => {
      if (cell.dataValidation) {
        dropdowns++;
        expect(cell.dataValidation.condition.type).toBe("ONE_OF_LIST");
        expect(cell.dataValidation.condition.values.map((v) => v.userEnteredValue)).toEqual(PROGRESS_OPTIONS);
      }
    })
  );
  expect(PROGRESS_OPTIONS).toEqual(["Yes", "No", "Maintained"]);
  expect(dropdowns).toBe(WEEKS * 3 * 8);
  expect(g[3][weekStartCol(1) + 6].dataValidation).toBeDefined();
  expect(g[3][weekStartCol(1) + 7].dataValidation).toBeUndefined();
});

test("color rules: Yes green, No red, Maintained blue, on every Progressed cell", () => {
  const layout = build(fullBody());
  expect(layout.progressRanges).toHaveLength(WEEKS * 3);
  const requests = buildProgressColorRequests(layout.progressRanges);
  expect(requests).toHaveLength(3);
  const byOption: Record<string, { red: number; green: number; blue: number }> = {};
  requests.forEach((req) => {
    const rule = req.addConditionalFormatRule.rule;
    expect(rule.ranges).toHaveLength(WEEKS * 3);
    byOption[rule.booleanRule.condition.values[0].userEnteredValue] = rule.booleanRule.format.backgroundColor;
  });
  expect(byOption.Yes.green).toBeGreaterThan(byOption.Yes.red);
  expect(byOption.No.red).toBeGreaterThan(byOption.No.green);
  expect(byOption.Maintained.blue).toBeGreaterThan(byOption.Maintained.red);
  const first = layout.progressRanges[0];
  expect(first.startRowIndex).toBe(3);
  expect(first.endRowIndex).toBe(11);
  expect(first.endColumnIndex - first.startColumnIndex).toBe(1);
});

test("merged areas stay inside the sheet and never overlap", () => {
  [fullBody(), upperLower()].forEach((program) => {
    const sheet = build(program).spreadsheet.sheets[0];
    const { rowCount, columnCount } = sheet.properties.gridProperties;
    const merges = sheet.merges;
    merges.forEach((m: GridRange) => {
      expect(m.startRowIndex).toBeGreaterThanOrEqual(0);
      expect(m.endRowIndex).toBeLessThanOrEqual(rowCount);
      expect(m.endColumnIndex).toBeLessThanOrEqual(columnCount);
    });
    for (let i = 0; i < merges.length; i++) {
      for (let j = i + 1; j < merges.length; j++) {
        const a = merges[i];
        const b = merges[j];
        const overlap =
          a.startRowIndex < b.endRowIndex &&
          b.startRowIndex < a.endRowIndex &&
          a.startColumnIndex < b.endColumnIndex &&
          b.startColumnIndex < a.endColumnIndex;
        expect(overlap).toBe(false);
      }
    }
  });
});

test("week headers are centered", () => {
  const g = cells(build(fullBody()));
  for (let week = 1; week <= WEEKS; week++) {
    expect(g[0][weekStartCol(week)].userEnteredFormat?.horizontalAlignment).toBe("CENTER");
  }
});

test("3 days a week: Full Body A, B and C stack vertically in every week", () => {
  const layout = build(fullBody());
  const g = cells(layout);
  expect(layout.spreadsheet.sheets[0].properties.gridProperties.rowCount).toBe(31);
  for (let week = 1; week <= WEEKS; week++) {
    const c0 = weekStartCol(week);
    expect(textOf(g[1][c0])).toBe("Full Body A");
    expect(textOf(g[11][c0])).toBe("Full Body B");
    expect(textOf(g[21][c0])).toBe("Full Body C");
    [2, 12, 22].forEach((headerRow) => expect(textOf(g[headerRow][c0])).toBe("Exercise"));
    [3, 13, 23].forEach((firstRow) => expect(textOf(g[firstRow][c0])).toBe(textOf(g[3][weekStartCol(1)])));
  }
  expect(layout.progressRanges).toHaveLength(WEEKS * 3);
});

test("2 days a week: Full Body A and B", () => {
  const layout = build(generateProgram(2, ["chest"], exercises));
  const g = cells(layout);
  expect(layout.spreadsheet.sheets[0].properties.gridProperties.rowCount).toBe(21);
  for (let week = 1; week <= WEEKS; week++) {
    const c0 = weekStartCol(week);
    expect(textOf(g[1][c0])).toBe("Full Body A");
    expect(textOf(g[11][c0])).toBe("Full Body B");
  }
  expect(layout.progressRanges).toHaveLength(WEEKS * 2);
  expect(textOf(g[1][2])).toBe("Full Body");
  expect(textOf(g[2][2])).toBe("2 / week");
});

test("4 days a week: Upper A, Lower A, Upper B, Lower B stack vertically in every week", () => {
  const layout = build(upperLower());
  const g = cells(layout);
  expect(layout.spreadsheet.sheets[0].properties.gridProperties.rowCount).toBe(31);
  expect(layout.progressRanges).toHaveLength(WEEKS * 4);
  for (let week = 1; week <= WEEKS; week++) {
    const c0 = weekStartCol(week);
    expect(textOf(g[1][c0])).toBe("Upper A");
    expect(textOf(g[9][c0])).toBe("Lower A");
    expect(textOf(g[16][c0])).toBe("Upper B");
    expect(textOf(g[24][c0])).toBe("Lower B");
    [2, 10, 17, 25].forEach((headerRow) => expect(textOf(g[headerRow][c0])).toBe("Exercise"));
    expect(textOf(g[18][c0])).toBe(textOf(g[3][c0]));
    expect(textOf(g[26][c0])).toBe(textOf(g[11][c0]));
  }
  expect(textOf(g[1][2])).toBe("Upper / Lower");
});

test("edits made on the site carry into every copy of the table", () => {
  const program = fullBody();
  const trimmed = { "Full Body A": program.workouts["Full Body A"].slice(0, 5) };
  const layout = build(program, "Ethan", trimmed);
  const g = cells(layout);
  const c0 = weekStartCol(1);
  expect(textOf(g[1][c0])).toBe("Full Body A");
  expect(textOf(g[8][c0])).toBe("Full Body B");
  expect(textOf(g[15][c0])).toBe("Full Body C");
  expect(layout.progressRanges[0].endRowIndex - layout.progressRanges[0].startRowIndex).toBe(5);
});

test("removing exercises or whole days does not break the layout", () => {
  const program = fullBody();
  const fewer = { "Full Body A": program.workouts["Full Body A"].slice(0, 2) };
  const small = build(program, "Ethan", fewer);
  expect(small.spreadsheet.sheets[0].properties.gridProperties.rowCount).toBe(16);
  expect(small.progressRanges).toHaveLength(WEEKS * 3);
  const empty = build(program, "Ethan", { "Full Body A": [] });
  expect(empty.progressRanges).toHaveLength(0);
  expect(empty.spreadsheet.sheets[0].properties.gridProperties.rowCount).toBe(16);
});

test("column and row sizes: lots of room to type, and sizes match the grid", () => {
  const layout = build(fullBody());
  const sheet = layout.spreadsheet.sheets[0];
  const { rowCount, columnCount } = sheet.properties.gridProperties;
  const data = sheet.data[0];
  expect(data.columnMetadata).toHaveLength(columnCount);
  expect(data.rowMetadata).toHaveLength(rowCount);
  expect(data.rowData).toHaveLength(rowCount);
  data.rowData.forEach((row) => expect(row.values).toHaveLength(columnCount));
  expect(data.rowMetadata[0].pixelSize).toBe(BANNER_HEIGHT);
  expect(data.rowMetadata[1].pixelSize).toBe(ROW_HEIGHT);
  expect(WEEK_COL_WIDTHS[4]).toBeGreaterThanOrEqual(160);
  expect(WEEK_COL_WIDTHS[7]).toBeGreaterThanOrEqual(240);
  const c0 = weekStartCol(3);
  WEEK_COL_WIDTHS.forEach((w, i) => expect(data.columnMetadata[c0 + i].pixelSize).toBe(w));
});

test("every cell with text wraps, so nothing spills into the next column", () => {
  [fullBody(), upperLower()].forEach((program) => {
    cells(build(program, "Ethan")).forEach((row) =>
      row.forEach((cell) => {
        if (cell.userEnteredValue) expect(cell.userEnteredFormat?.wrapStrategy).toBe("WRAP");
      })
    );
  });
});

// A rough fit check: estimates how wide each piece of text is and how many lines it needs, then
// checks it fits the cell (or merged area) it sits in. An estimate, not a real render.
function fitProblems(layout: SheetLayout): string[] {
  const sheet = layout.spreadsheet.sheets[0];
  const widths = sheet.data[0].columnMetadata.map((c) => c.pixelSize);
  const heights = sheet.data[0].rowMetadata.map((r) => r.pixelSize);
  const mergeAt = new Map<string, GridRange>();
  sheet.merges.forEach((m) => mergeAt.set(`${m.startRowIndex},${m.startColumnIndex}`, m));
  const problems: string[] = [];
  cells(layout).forEach((row, r) =>
    row.forEach((cell, c) => {
      const text = textOf(cell);
      if (!text || !cell.userEnteredFormat) return;
      const m = mergeAt.get(`${r},${c}`);
      const c2 = m ? m.endColumnIndex : c + 1;
      const r2 = m ? m.endRowIndex : r + 1;
      let width = 0;
      for (let i = c; i < c2; i++) width += widths[i];
      let height = 0;
      for (let i = r; i < r2; i++) height += heights[i];
      const size = cell.userEnteredFormat.textFormat.fontSize;
      const bold = cell.userEnteredFormat.textFormat.bold;
      const charPx = 7 * (size / 10) * (bold ? 1.1 : 1);
      const lines = Math.ceil((text.length * charPx) / (width - 10));
      const needed = lines * size * 1.87;
      if (needed > height) problems.push(`row ${r} col ${c} "${text}" needs ${Math.round(needed)}px, has ${height}px`);
    })
  );
  return problems;
}

test("text fits its cell (estimate), including a very long first name", () => {
  expect(fitProblems(build(fullBody(), "Ethan"))).toEqual([]);
  expect(fitProblems(build(upperLower(), "Christopher-Alexander Montgomery-Smith"))).toEqual([]);
  [["shoulders", "glutes"], ["back", "arms"], ["legs", "glutes"]].forEach((pri) => {
    const program = generateProgram(3, pri as Program["priorities"], exercises);
    expect(fitProblems(build(program, "Ethan"))).toEqual([]);
  });
});
