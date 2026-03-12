// BE-17: GET /api/medications?search=&category=
// Listar medicamentos con semáforo calculado SERVER-SIDE y primer batch por vencer.
// Turso tables: Medications, Batches
import { NextRequest, NextResponse } from "next/server";
import { turso as db } from "@/app/turso";

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
    const search = searchParams.get("search") ?? "";

    // Query principal de medicamentos

    let sql = `
      SELECT 
        m.medicationId,
        m.brandName,
        m.activeIngredient,
        m.presentation,
        m.currentStock,
        m.reorderPoint
      FROM Medications m
      WHERE 1=1
    `;
    const args: string[] = [];

    if (search) {
      sql += ` AND (m.brandName LIKE ? OR m.activeIngredient LIKE ?)`;
      args.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY m.brandName ASC`;

    const { rows: medications } = await db.execute({ sql, args });

    // Para cada medicamento, obtener el próximo batch por vencer
    const medicationsConSemaforo = await Promise.all(
      medications.map(async (med) => {
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