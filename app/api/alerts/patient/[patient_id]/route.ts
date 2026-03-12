import { NextRequest, NextResponse } from "next/server";
import { turso } from "@/app/turso";

export async function GET(
  req: NextRequest,
  { params }: { params: { patient_id: string } }
) {
  const patientId = params.patient_id;

  try {
    const result = await turso.execute({
      sql: `SELECT 
              cn.noteId,
              cn.noteContent,
              cn.alertTags,
              cn.createdAt,
              u.firstName as authorFirstName,
              u.lastName as authorLastName
            FROM CollaborativeNotes cn
            JOIN Users u ON cn.authorId = u.userId
            WHERE cn.patientId = ? AND cn.isAlert = 1
            ORDER BY cn.createdAt DESC`,
      args: [patientId],
    });

    const byTag = result.rows.reduce((acc: Record<string, any[]>, note) => {
      const tag = (note.alertTags as string) ?? "general";
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(note);
      return acc;
    }, {});

    return NextResponse.json(
      { total: result.rows.length, alerts: result.rows, byTag },
      { status: 200 }
    );
  } catch (error) {
    console.error("[BE-30] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}