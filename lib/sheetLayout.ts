import { Program, ProgramExercise, getRIR } from "./programGenerator";

// Describes the whole exported sheet as a Google Sheets "create" request. Nothing here talks to
// Google, so it can be tested offline. One tab ("Program"): the Overview sits at the left and the
// 8 weeks run side by side to its right. Nothing is frozen, so on a phone everything scrolls.

export interface GridRange {
  sheetId: number;
  startRowIndex: number;
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
}

interface Rgb {
  red: number;
  green: number;
  blue: number;
}

interface Border {
  style: string;
  width: number;
  color: Rgb;
}

export interface CellData {
  userEnteredValue?: { stringValue?: string; numberValue?: number };
  userEnteredFormat?: {
    backgroundColor: Rgb;
    horizontalAlignment: string;
    verticalAlignment: string;
    wrapStrategy: string;
    textFormat: { fontFamily: string; fontSize: number; bold: boolean; foregroundColor: Rgb };
    borders?: { top: Border; bottom: Border; left: Border; right: Border };
  };
  dataValidation?: {
    condition: { type: string; values: { userEnteredValue: string }[] };
    showCustomUi: boolean;
    strict: boolean;
  };
}

export interface SheetSpec {
  properties: { title: string };
  sheets: {
    properties: {
      sheetId: number;
      title: string;
      gridProperties: { rowCount: number; columnCount: number; hideGridlines: boolean };
      tabColorStyle: { rgbColor: Rgb };
    };
    data: {
      startRow: number;
      startColumn: number;
      rowData: { values: CellData[] }[];
      rowMetadata: { pixelSize: number }[];
      columnMetadata: { pixelSize: number }[];
    }[];
    merges: GridRange[];
  }[];
}

export interface SheetLayout {
  spreadsheet: SheetSpec;
  // The "Progressed Load/Reps?" cells of every week - the colors for Yes / No / Maintained are
  // applied to these after the sheet is created.
  progressRanges: GridRange[];
}

export const PROGRESS_OPTIONS = ["Yes", "No", "Maintained"];

const COLORS = {
  black: "#000000",
  white: "#FFFFFF",
  text: "#111827",
  emerald: "#059669",
  emeraldBright: "#34D399",
  header: "#111827",
  day: "#4B5563",
  border: "#9CA3AF",
  input: "#D1FAE5",
  yes: "#166534",
  no: "#B91C1C",
  maintained: "#1D4ED8"
};

export const PROGRESS_COLORS: Record<string, string> = {
  Yes: COLORS.yes,
  No: COLORS.no,
  Maintained: COLORS.maintained
};


const FONT = "Nunito";
const FONT_SIZE = 10;
const TITLE_SIZE = 14;
const BANNER_SIZE = 18;

// Column map. The black panel has a thin margin column on each side of the Overview.
export const SHEET_ID = 0;
export const WEEKS = 8;
const COL_MARGIN_LEFT = 0;
const COL_LABEL = 1;
const COL_VALUE = 2;
const COL_MARGIN_RIGHT = 3;
const COL_GAP = 4;
export const WEEK_START = 5;

export const COLUMN_HEADERS = [
  "Exercise",
  "Sets",
  "Reps",
  "Intensity (RIR)",
  "Weight x Reps",
  "RIR",
  "Progressed Load/Reps?",
  "Notes"
];
// Wide enough that names and headers fit on one line, with extra room to type in Weight x Reps and
// Notes. Order matches COLUMN_HEADERS.
export const WEEK_COL_WIDTHS = [340, 50, 64, 130, 170, 64, 180, 260];
const BLOCK_COLS = WEEK_COL_WIDTHS.length;
const WEEK_SPACER_WIDTH = 28;

export const ROW_HEIGHT = 40;
export const BANNER_HEIGHT = 56;
export const OVERVIEW_ROWS = 16;
export const OVERVIEW_WIDTHS = { margin: 14, label: 120, value: 170 };

export const HOW_TO_1 = "1. Perform the exercises to the prescribed RIR for the week - Intensity (RIR)";
export const HOW_TO_2 = "2. Log your training - Weight x Reps, RIR (achieved), Notes (if any)";
export const RIR_EXPLANATION =
  "RIR = reps in reserve (no. of clean reps you could have performed with standardized form)";

export function weekStartCol(week: number): number {
  return WEEK_START + (week - 1) * (BLOCK_COLS + 1);
}

export function titleFor(firstName?: string | null): string {
  const name = (firstName ?? "").trim().slice(0, 30);
  return name ? `${name}\u2019s Program` : "Your Program";
}

function rgb(hex: string): Rgb {
  return {
    red: parseInt(hex.slice(1, 3), 16) / 255,
    green: parseInt(hex.slice(3, 5), 16) / 255,
    blue: parseInt(hex.slice(5, 7), 16) / 255
  };
}

interface CellSpec {
  text?: string;
  num?: number;
  bg?: string;
  color?: string;
  bold?: boolean;
  size?: number;
  align?: "LEFT" | "CENTER" | "RIGHT";
  border?: boolean;
  validation?: boolean;
}

function toCellData(spec: CellSpec | undefined): CellData {
  if (!spec) return {};
  const cell: CellData = {};
  if (spec.text !== undefined) cell.userEnteredValue = { stringValue: spec.text };
  else if (spec.num !== undefined) cell.userEnteredValue = { numberValue: spec.num };
  const side: Border = { style: "SOLID", width: 1, color: rgb(COLORS.border) };
  cell.userEnteredFormat = {
    backgroundColor: rgb(spec.bg ?? COLORS.white),
    horizontalAlignment: spec.align ?? "CENTER",
    verticalAlignment: "MIDDLE",
    wrapStrategy: "WRAP",
    textFormat: {
      fontFamily: FONT,
      fontSize: spec.size ?? FONT_SIZE,
      bold: spec.bold ?? false,
      foregroundColor: rgb(spec.color ?? COLORS.text)
    }
  };
  if (spec.border) cell.userEnteredFormat.borders = { top: side, bottom: side, left: side, right: side };
  if (spec.validation) {
    cell.dataValidation = {
      condition: { type: "ONE_OF_LIST", values: PROGRESS_OPTIONS.map((v) => ({ userEnteredValue: v })) },
      showCustomUi: true,
      strict: true
    };
  }
  return cell;
}

function priorityLabel(priorities: string[]): string {
  if (priorities.length === 0) return "None";
  return priorities.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" + ");
}

export interface LayoutOptions {
  title: string;
  firstName?: string | null;
}

export function buildProgramSheet(
  program: Program,
  workouts: Record<string, ProgramExercise[]>,
  options: LayoutOptions
): SheetLayout {
  const columnCount = weekStartCol(WEEKS) + BLOCK_COLS;

  // How many rows one week needs: a banner, then for every workout day a day bar, a header row and
  // one row per exercise. Every week has the same shape, so they line up across the sheet.
  const dayEntries = Object.entries(workouts);
  let weekRows = 1;
  dayEntries.forEach(([, exercises]) => {
    weekRows += 2 + exercises.length;
  });
  const rowCount = Math.max(OVERVIEW_ROWS, weekRows);

  const grid: (CellSpec | undefined)[][] = [];
  for (let r = 0; r < rowCount; r++) grid.push(new Array<CellSpec | undefined>(columnCount).fill(undefined));
  const merges: GridRange[] = [];
  const progressRanges: GridRange[] = [];

  function put(r: number, c: number, spec: CellSpec) {
    grid[r][c] = spec;
  }

  // Fills every cell of a rectangle with the same look and merges it; only the top-left cell keeps
  // the text, so borders and fill are consistent across the merged area.
  function putMerged(r1: number, r2: number, c1: number, c2: number, spec: CellSpec) {
    for (let r = r1; r < r2; r++) {
      for (let c = c1; c < c2; c++) {
        put(r, c, r === r1 && c === c1 ? spec : { ...spec, text: undefined, num: undefined });
      }
    }
    if (r2 - r1 > 1 || c2 - c1 > 1) {
      merges.push({
        sheetId: SHEET_ID,
        startRowIndex: r1,
        endRowIndex: r2,
        startColumnIndex: c1,
        endColumnIndex: c2
      });
    }
  }

  // ---- Overview (left) ----
  for (let r = 0; r < OVERVIEW_ROWS; r++) {
    put(r, COL_MARGIN_LEFT, { bg: COLORS.black });
    put(r, COL_MARGIN_RIGHT, { bg: COLORS.black });
  }
  putMerged(0, 1, COL_LABEL, COL_MARGIN_RIGHT, {
    text: titleFor(options.firstName),
    bg: COLORS.black,
    color: COLORS.emeraldBright,
    bold: true,
    size: TITLE_SIZE
  });

  const detail = (r: number, label: string, value: string) => {
    put(r, COL_LABEL, { text: label, bg: COLORS.day, color: COLORS.white, bold: true, border: true });
    put(r, COL_VALUE, { text: value, border: true });
  };
  detail(1, "Split", program.split === "upper_lower_4" ? "Upper / Lower" : "Full Body");
  detail(2, "Training days", `${program.trainingDays} / week`);
  detail(3, "Priority", priorityLabel(program.priorities));

  const sectionHeader = (r: number, text: string) =>
    putMerged(r, r + 1, COL_LABEL, COL_MARGIN_RIGHT, {
      text,
      bg: COLORS.emerald,
      color: COLORS.white,
      bold: true,
      border: true
    });
  const paragraph = (r1: number, r2: number, text: string) =>
    putMerged(r1, r2, COL_LABEL, COL_MARGIN_RIGHT, { text, align: "LEFT", border: true });

  sectionHeader(4, "How to use");
  paragraph(5, 7, HOW_TO_1);
  paragraph(7, 9, HOW_TO_2);

  sectionHeader(9, "RIR by week");
  put(10, COL_LABEL, { text: "Weeks", bg: COLORS.day, color: COLORS.white, bold: true, border: true });
  put(10, COL_VALUE, { text: "RIR", bg: COLORS.day, color: COLORS.white, bold: true, border: true });
  const rirRow = (r: number, label: string, week: number) => {
    put(r, COL_LABEL, { text: label, border: true });
    put(r, COL_VALUE, { text: getRIR(week), border: true });
  };
  rirRow(11, "Week 1", 1);
  rirRow(12, "Weeks 2-5", 2);
  rirRow(13, "Weeks 6-8", 6);
  paragraph(14, 16, RIR_EXPLANATION);

  // ---- Weeks (side by side) ----
  for (let week = 1; week <= WEEKS; week++) {
    const c0 = weekStartCol(week);
    putMerged(0, 1, c0, c0 + BLOCK_COLS, {
      text: `Week ${week}`,
      bg: COLORS.emerald,
      color: COLORS.white,
      bold: true,
      size: BANNER_SIZE,
      align: "LEFT"
    });

    let r = 1;
    const rir = getRIR(week);
    dayEntries.forEach(([dayName, exercises]) => {
      putMerged(r, r + 1, c0, c0 + BLOCK_COLS, {
        text: dayName,
        bg: COLORS.day,
        color: COLORS.white,
        bold: true
      });
      r++;

      COLUMN_HEADERS.forEach((header, i) => {
        put(r, c0 + i, { text: header, bg: COLORS.header, color: COLORS.white, bold: true, border: true });
      });
      r++;

      const firstExerciseRow = r;
      exercises.forEach((ex) => {
        put(r, c0 + 0, { text: ex.exerciseName, bold: true, border: true });
        put(r, c0 + 1, { num: ex.sets, border: true });
        put(r, c0 + 2, { text: `${ex.repMin}-${ex.repMax}`, border: true });
        put(r, c0 + 3, { text: rir, border: true });
        put(r, c0 + 4, { bg: COLORS.input, border: true });
        put(r, c0 + 5, { bg: COLORS.input, border: true });
        put(r, c0 + 6, { bg: COLORS.input, border: true, validation: true });
        put(r, c0 + 7, { bg: COLORS.input, border: true });
        r++;
      });
      if (r > firstExerciseRow) {
        progressRanges.push({
          sheetId: SHEET_ID,
          startRowIndex: firstExerciseRow,
          endRowIndex: r,
          startColumnIndex: c0 + 6,
          endColumnIndex: c0 + 7
        });
      }
    });
  }

  // ---- Convert to API shape ----
  const rowData = grid.map((row) => ({ values: row.map((spec) => toCellData(spec)) }));
  const rowMetadata = grid.map((_, r) => ({ pixelSize: r === 0 ? BANNER_HEIGHT : ROW_HEIGHT }));

  const columnWidths: number[] = [
    OVERVIEW_WIDTHS.margin,
    OVERVIEW_WIDTHS.label,
    OVERVIEW_WIDTHS.value,
    OVERVIEW_WIDTHS.margin,
    WEEK_SPACER_WIDTH
  ];
  for (let week = 1; week <= WEEKS; week++) {
    WEEK_COL_WIDTHS.forEach((w) => columnWidths.push(w));
    if (week < WEEKS) columnWidths.push(WEEK_SPACER_WIDTH);
  }

  return {
    spreadsheet: {
      properties: { title: options.title },
      sheets: [
        {
          properties: {
            sheetId: SHEET_ID,
            title: "Program",
            gridProperties: { rowCount, columnCount, hideGridlines: true },
            tabColorStyle: { rgbColor: rgb(COLORS.emerald) }
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData,
              rowMetadata,
              columnMetadata: columnWidths.map((pixelSize) => ({ pixelSize }))
            }
          ],
          merges
        }
      ]
    },
    progressRanges
  };
}

// Yes / No / Maintained turn the dropdown cell green / red / blue. Sent after the sheet exists.
export function buildProgressColorRequests(ranges: GridRange[]) {
  return PROGRESS_OPTIONS.map((option, index) => ({
    addConditionalFormatRule: {
      index,
      rule: {
        ranges,
        booleanRule: {
          condition: { type: "TEXT_EQ", values: [{ userEnteredValue: option }] },
          format: {
            backgroundColor: rgb(PROGRESS_COLORS[option]),
            textFormat: { foregroundColor: rgb(COLORS.white), bold: true }
          }
        }
      }
    }
  }));
}
