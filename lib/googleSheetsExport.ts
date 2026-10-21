import { Program, ProgramExercise } from "./programGenerator";
import { buildProgramSheet, buildProgressColorRequests, GridRange } from "./sheetLayout";

interface ExportResult {
  spreadsheetUrl: string;
}

export interface ExportOptions {
  // Used for the Overview title ("Ethan's Program"). Left out, the title reads "Your Program".
  firstName?: string | null;
}

const SHEETS_URL = "https://sheets.googleapis.com/v4/spreadsheets";

function priorityLabel(priorities: string[]): string {
  if (priorities.length === 0) return "None";
  return priorities.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" + ");
}

// The plain layout: a summary block, then one small table per workout day. Only used as a safety
// net if Google rejects the formatted sheet.
export function buildProgramRows(program: Program, workouts: Record<string, ProgramExercise[]>): string[][] {
  const rows: string[][] = [];

  rows.push(["Program Summary"]);
  rows.push(["Split", program.split === "upper_lower_4" ? "Upper / Lower" : "Full Body"]);
  rows.push(["Training days", `${program.trainingDays} / week`]);
  rows.push(["Priority", priorityLabel(program.priorities)]);
  rows.push([]);

  Object.entries(workouts).forEach(([dayName, exercises]) => {
    rows.push([dayName]);
    rows.push(["#", "Exercise", "Sets", "Reps"]);
    exercises.forEach((ex, i) => {
      rows.push([String(i + 1), ex.exerciseName, String(ex.sets), `${ex.repMin}-${ex.repMax}`]);
    });
    rows.push([]);
  });

  return rows;
}

// Google answers 401 when the sign-in has expired, and 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT when
// the Drive permission box was not ticked. Signing in again fixes both, so these are passed on
// untouched (the page looks for these exact messages) instead of falling back to a plain sheet.
function isGoogleAuthFailure(status: number, errText: string): boolean {
  return status === 401 || errText.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT");
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };
}

// Colors the Progressed dropdown (Yes green, No red, Maintained blue). The sheet already works
// without this, so a failure here is logged and never stops the export.
async function applyProgressColors(accessToken: string, spreadsheetId: string, ranges: GridRange[]) {
  if (ranges.length === 0) return;
  try {
    const res = await fetch(`${SHEETS_URL}/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ requests: buildProgressColorRequests(ranges) })
    });
    if (!res.ok) console.error("Could not color the Progressed dropdown:", res.status, await res.text());
  } catch (err) {
    console.error("Could not color the Progressed dropdown:", err);
  }
}

async function exportPlainSheet(
  accessToken: string,
  program: Program,
  workouts: Record<string, ProgramExercise[]>,
  title: string
): Promise<ExportResult> {
  const createRes = await fetch(SHEETS_URL, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ properties: { title } })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create spreadsheet (${createRes.status}): ${errText}`);
  }

  const created = (await createRes.json()) as { spreadsheetId: string; spreadsheetUrl: string };
  const rows = buildProgramRows(program, workouts);

  const updateRes = await fetch(
    `${SHEETS_URL}/${created.spreadsheetId}/values/Sheet1!A1?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ values: rows })
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Spreadsheet was created but couldn't be filled in (${updateRes.status}): ${errText}`);
  }

  return { spreadsheetUrl: created.spreadsheetUrl };
}

// Scope required: https://www.googleapis.com/auth/drive.file (requested in lib/authOptions.ts).
// It only covers files this app creates, never the rest of the person's Drive.
export async function exportProgramToSheets(
  accessToken: string,
  program: Program,
  workouts: Record<string, ProgramExercise[]>,
  options: ExportOptions = {}
): Promise<ExportResult> {
  const title = `Training Program - ${new Date().toLocaleDateString()}`;
  const layout = buildProgramSheet(program, workouts, { title, firstName: options.firstName });

  const res = await fetch(SHEETS_URL, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(layout.spreadsheet)
  });

  if (res.ok) {
    const created = (await res.json()) as { spreadsheetId: string; spreadsheetUrl: string };
    await applyProgressColors(accessToken, created.spreadsheetId, layout.progressRanges);
    return { spreadsheetUrl: created.spreadsheetUrl };
  }

  const errText = await res.text();
  if (isGoogleAuthFailure(res.status, errText)) {
    throw new Error(`Failed to create spreadsheet (${res.status}): ${errText}`);
  }

  console.error("Google rejected the formatted sheet, using the plain layout:", res.status, errText);
  return exportPlainSheet(accessToken, program, workouts, title);
}
