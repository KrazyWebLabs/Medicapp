// BE-18: POST /api/medications/batches
// Registrar entrada de lote (cantidad + fechaExpiración).
// TRANSACCIÓN: insertar Batch + UPDATE Medications.currentStock sumando quantity.
// Turso tables: Medications, Batches

import { createClient } from "@libsql/client";
import { NextRequest, NextResponse } from "next/server";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

interface BatchBody {
  medicationId: string;
  quantity: number;
  expirationDate: string; // ISO date: "2026-12-31"
  supplier?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: BatchBody = await req.json();
    const { medicationId, quantity, expirationDate, supplier } = body;

    // Validaciones básicas
    if (!medicationId || !quantity || !expirationDate) {
      return NextResponse.json(
        {
          data: null,
          error: "medicationId, quantity y expirationDate son requeridos",
          status: 400,
        },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { data: null, error: "La cantidad debe ser mayor a 0", status: 400 },
        { status: 400 }
      );
    }

    // Verificar que el medicamento existe
    const { rows: medRows } = await db.execute({
      sql: `SELECT medicationId, currentStock FROM Medications WHERE medicationId = ?`,
      args: [medicationId],
    });

    if (medRows.length === 0) {
      return NextResponse.json(
        { data: null, error: "Medicamento no encontrado", status: 404 },
        { status: 404 }
      );
    }

    const stockActual = Number((medRows[0] as any).currentStock);
    const nuevoStock = stockActual + quantity;
    const createdAt = new Date().toISOString();

    // TRANSACCIÓN: insertar batch + actualizar stock (Turso usa batch para transacciones)
    const results = await db.batch([
      {
        sql: `
          INSERT INTO Batches (medicationId, quantity, expirationDate, supplier, createdAt)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [medicationId, quantity, expirationDate, supplier ?? null, createdAt],
      },
      {
        sql: `UPDATE Medications SET currentStock = ? WHERE medicationId = ?`,
        args: [nuevoStock, medicationId],
      },
    ]);

    const batchId = results[0].lastInsertRowid?.toString();

    return NextResponse.json(
      {
        data: {
          batchId,
          medicationId,
          cantidadAgregada: quantity,
          stockActualizado: nuevoStock,
        },
        error: null,
        status: 201,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[BE-18] Error al registrar lote:", error);
    return NextResponse.json(
      { data: null, error: "Error interno del servidor", status: 500 },
      { status: 500 }
    );
  }
}