import { Program, ProgramExercise } from "./programGenerator";

interface ExportResult {
  spreadsheetUrl: string;
}

function priorityLabel(priorities: string[]): string {
  if (priorities.length === 0) return "None";
  return priorities.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" + ");
}

// Builds a plain 2D grid of strings matching what ReviewExport.tsx shows on screen - summary
// block first, then one section per workout day with a small header row and one row per exercise.
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

// Two real HTTP calls to the Google Sheets REST API - no googleapis SDK, to keep the dependency
// footprint small and the request/response shape fully visible and easy to debug.
//
// Scope required: https://www.googleapis.com/auth/drive.file (requested in the NextAuth Google
// provider config) - this only grants access to files this app creates, never the user's whole
// Drive. That's a deliberate, minimal-permission choice over the broader drive.readonly/drive
// scopes.
export async function exportProgramToSheets(
  accessToken: string,
  program: Program,
  workouts: Record<string, ProgramExercise[]>
): Promise<ExportResult> {
  const title = `Training Program - ${new Date().toLocaleDateString()}`;

  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ properties: { title } })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create spreadsheet (${createRes.status}): ${errText}`);
  }

  const created = (await createRes.json()) as { spreadsheetId: string; spreadsheetUrl: string };
  const rows = buildProgramRows(program, workouts);

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${created.spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ values: rows })
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Spreadsheet was created but couldn't be filled in (${updateRes.status}): ${errText}`);
  }

  return { spreadsheetUrl: created.spreadsheetUrl };
}
