import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { exportProgramToSheets } from "@/lib/googleSheetsExport";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in with Google." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { program, workouts } = (body ?? {}) as { program?: unknown; workouts?: unknown };
  if (!program || !workouts) {
    return NextResponse.json({ error: "Missing program or workouts data." }, { status: 400 });
  }

  try {
    // First name from the Google sign-in, used to title the sheet ("Ethan's Program").
    const fullName = session.user?.name ?? "";
    const firstName = fullName.trim().split(/\s+/)[0] || null;
    const result = await exportProgramToSheets(session.accessToken, program as any, workouts as any, {
      firstName
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error exporting to Sheets.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
