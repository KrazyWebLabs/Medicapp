// BE-17: GET /api/medications?search=&category=
// Listar medicamentos con semáforo calculado SERVER-SIDE y primer batch por vencer.
// Turso tables: Medications, Batches

import { createClient } from "@libsql/client";
import { NextRequest, NextResponse } from "next/server";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Calcula el color del semáforo según el stock y el punto de reorden
function calcularSemaforo(
  currentStock: number,
  reorderPoint: number
): "verde" | "amarillo" | "rojo" {
  if (currentStock > reorderPoint * 2) return "verde";
  if (currentStock > reorderPoint) return "amarillo";
  return "rojo"; // stock <= reorderPoint
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search   = searchParams.get("search") ?? "";
    const category = searchParams.get("category") ?? "";

    // Query principal de medicamentos
    let sql = `
      SELECT 
        m.medicationId,
        m.name,
        m.category,
        m.code,
        m.currentStock,
        m.reorderPoint,
        m.unit
      FROM Medications m
      WHERE 1=1
    `;
    const args: string[] = [];

    if (search) {
      sql += ` AND (m.name LIKE ? OR m.code LIKE ?)`;
      args.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      sql += ` AND m.category = ?`;
      args.push(category);
    }

    sql += ` ORDER BY m.name ASC`;

    const { rows: medications } = await db.execute({ sql, args });

    // Para cada medicamento, obtener el próximo batch por vencer
    const medicationsConSemaforo = await Promise.all(
      medications.map(async (med: any) => {
        const { rows: batches } = await db.execute({
          sql: `
            SELECT batchId, expirationDate, quantity
            FROM Batches
            WHERE medicationId = ? AND quantity > 0
            ORDER BY expirationDate ASC
            LIMIT 1
          `,
          args: [med.medicationId],
        });

        const semaforo = calcularSemaforo(
          Number(med.currentStock),
          Number(med.reorderPoint)
        );

        return {
          ...med,
          semaforo,                          // "verde" | "amarillo" | "rojo"
          proximoBatchPorVencer: batches[0] ?? null,
        };
      })
    );

    return NextResponse.json(
      {
        data: medicationsConSemaforo,
        error: null,
        status: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[BE-17] Error al listar medicamentos:", error);
    return NextResponse.json(
      { data: null, error: "Error interno del servidor", status: 500 },
      { status: 500 }
    );
  }
}