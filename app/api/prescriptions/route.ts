import { NextRequest, NextResponse } from "next/server";
import { turso } from "@/app/turso";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { consultationId, medicationId, dosage, frequency, duration } = body;

    if (!consultationId || !medicationId) {
      return NextResponse.json(
        { error: "consultationId y medicationId son requeridos" },
        { status: 400 }
      );
    }

    const stockResult = await turso.execute({
      sql: `SELECT currentStock, brandName FROM Medications WHERE medicationId = ?`,
      args: [medicationId],
    });

    if (stockResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Medicamento no encontrado" },
        { status: 404 }
      );
    }

    const stock = stockResult.rows[0].currentStock as number;

    if (stock === 0) {
      return NextResponse.json(
        {
          error: "Stock insuficiente",
          message: `"${stockResult.rows[0].brandName}" no tiene stock disponible`,
        },
        { status: 400 }
      );
    }

    const result = await turso.execute({
      sql: `INSERT INTO Prescriptions (consultationId, medicationId, dosage, frequency, duration)
            VALUES (?, ?, ?, ?, ?)`,
      args: [consultationId, medicationId, dosage ?? null, frequency ?? null, duration ?? null],
    });

    return NextResponse.json(
      { message: "Receta creada exitosamente", prescriptionId: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    console.error("[BE-31] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}