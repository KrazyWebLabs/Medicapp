// BE-15: POST /api/notes
// Crear nota colaborativa post-consulta. isAlert=1 genera alerta entre módulos.
// Turso tables: CollaborativeNotes, Users

import { createClient } from "@libsql/client";
import { NextRequest, NextResponse } from "next/server";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

interface CreateNoteBody {
  patientId: string;
  authorId: string;
  noteContent: string;
  isAlert?: number; // 0 = nota normal, 1 = alerta entre módulos
  alertTag?: string; // ej: "STOCK", "NUTRICION", "CLINICO"
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateNoteBody = await req.json();
    const { patientId, authorId, noteContent, isAlert = 0, alertTag } = body;

    // Validación: noteContent NO puede estar vacío
    if (!noteContent || noteContent.trim() === "") {
      return NextResponse.json(
        { data: null, error: "noteContent no puede estar vacío", status: 400 },
        { status: 400 }
      );
    }

    // Validar que el autor exista en Users
    const { rows: authorRows } = await db.execute({
      sql: `SELECT userId FROM Users WHERE userId = ?`,
      args: [authorId],
    });

    if (authorRows.length === 0) {
      return NextResponse.json(
        { data: null, error: "El autor no existe en el sistema", status: 404 },
        { status: 404 }
      );
    }

    // Insertar la nota
    const createdAt = new Date().toISOString();

    const result = await db.execute({
      sql: `
        INSERT INTO CollaborativeNotes 
          (patientId, authorId, noteContent, isAlert, alertTag, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [patientId, authorId, noteContent.trim(), isAlert, alertTag ?? null, createdAt],
    });

    const noteId = result.lastInsertRowid?.toString();

    return NextResponse.json(
      {
        data: { noteId, createdAt },
        error: null,
        status: 201,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[BE-15] Error al crear nota:", error);
    return NextResponse.json(
      { data: null, error: "Error interno del servidor", status: 500 },
      { status: 500 }
    );
  }
}