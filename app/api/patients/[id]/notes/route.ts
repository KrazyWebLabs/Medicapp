// BE-16: GET /api/patients/[id]/notes
// Listar notas del paciente. Filtros: isAlert, from, to. Paginación offset/limit.
// Turso tables: CollaborativeNotes, Users

import { NextRequest, NextResponse } from "next/server";
import { turso as db } from "@/app/turso";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: patientId } = await params;
    const { searchParams } = new URL(req.url);

    // Leer parámetros de filtro y paginación
    const isAlert = searchParams.get("isAlert"); // "1" o "0"
    const from = searchParams.get("from"); // fecha ISO
    const to = searchParams.get("to"); // fecha ISO
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    // Construir query dinámicamente según los filtros presentes
    let sql = `
      SELECT 
        cn.noteId,
        cn.noteContent,
        cn.isAlert,
        cn.alertTags,
        cn.createdAt,
        u.firstName || ' ' || u.lastName AS authorName,
        u.userId AS authorId
      FROM CollaborativeNotes cn
      JOIN Users u ON u.userId = cn.authorId
      WHERE cn.patientId = ?
    `;

    const args: (string | number | bigint | null)[] = [patientId];

    if (isAlert !== null) {
      sql += ` AND cn.isAlert = ?`;
      args.push(parseInt(isAlert));
    }

    if (from) {
      sql += ` AND cn.createdAt >= ?`;
      args.push(from);
    }

    if (to) {
      sql += ` AND cn.createdAt <= ?`;
      args.push(to);
    }

    sql += ` ORDER BY cn.createdAt DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const { rows: notes } = await db.execute({ sql, args });

    // Contar total para paginación
    let countSql = `SELECT COUNT(*) as total FROM CollaborativeNotes WHERE patientId = ?`;
    const countArgs: (string | number | bigint | null)[] = [patientId];

    if (isAlert !== null) {
      countSql += ` AND isAlert = ?`;
      countArgs.push(parseInt(isAlert));
    }
    if (from) {
      countSql += ` AND createdAt >= ?`;
      countArgs.push(from);
    }
    if (to) {
      countSql += ` AND createdAt <= ?`;
      countArgs.push(to);
    }

    const { rows: countRows } = await db.execute({
      sql: countSql,
      args: countArgs,
    });
    const total = Number(countRows[0].total);

    return NextResponse.json(
      {
        data: {
          notes,
          pagination: { total, limit, offset, hasMore: offset + limit < total },
        },
        error: null,
        status: 200,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[BE-16] Error al listar notas:", error);
    return NextResponse.json(
      { data: null, error: "Error interno del servidor", status: 500 },
      { status: 500 },
    );
  }
}
