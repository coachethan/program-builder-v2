import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { exportProgramToSheets } from "@/lib/googleSheetsExport";

// The client never gets to claim "I'm signed in" - this route re-checks the session server-side
// via getServerSession on every call, so a request without a valid Google session is rejected
// regardless of what the client sends.
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
    const result = await exportProgramToSheets(session.accessToken, program as any, workouts as any);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error exporting to Sheets.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
