// BE-19: POST /api/medications/dispense
// Registrar salida de insumo ligada a una prescripción.
// - No permite stock negativo (retorna 400)
// - Si stock resultante <= reorderPoint → insertar alerta en CollaborativeNotes automáticamente
// Turso tables: Medications, Prescriptions, CollaborativeNotes

import { NextRequest, NextResponse } from "next/server";
import { turso as db } from "@/app/turso";
import { InStatement } from "@libsql/client";

interface DispenseBody {
  medicationId: string;
  prescriptionId: string;
  quantity: number;
  dispensedBy: string;
  patientId: string; // ← nuevo
}

export async function POST(req: NextRequest) {
  try {
    const body: DispenseBody = await req.json();
    const { medicationId, prescriptionId, quantity, dispensedBy, patientId } = body;

    // Validaciones básicas
    if (!medicationId || !prescriptionId || !quantity || !dispensedBy) {
      return NextResponse.json(
        {
          data: null,
          error: "medicationId, prescriptionId, quantity y dispensedBy son requeridos",
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

    // Obtener stock y reorderPoint del medicamento
    const { rows: medRows } = await db.execute({
      sql: `SELECT medicationId, brandName, currentStock, reorderPoint FROM Medications WHERE medicationId = ?`,
      args: [medicationId],
    });

    if (medRows.length === 0) {
      return NextResponse.json(
        { data: null, error: "Medicamento no encontrado", status: 404 },
        { status: 404 }
      );
    }

    const med = medRows[0];
    const stockActual = Number(med.currentStock);
    const reorderPoint = Number(med.reorderPoint);
    const nuevoStock = stockActual - quantity;

    // REGLA CRÍTICA: No se permite stock negativo
    if (nuevoStock < 0) {
      return NextResponse.json(
        {
          data: null,
          error: `Stock insuficiente. Stock actual: ${stockActual}, solicitado: ${quantity}`,
          status: 400,
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Preparar las operaciones de la transacción
    const operations: InStatement[] = [
      // Solo actualizar el stock
      {
        sql: `UPDATE Medications SET currentStock = ? WHERE medicationId = ?`,
        args: [nuevoStock, medicationId],
      },
    ];

    // 3. Si el nuevo stock queda en zona de alerta, insertar CollaborativeNote isAlert=1
    let alertaGenerada = false;

    // Alerta si stock <= reorderPoint
    if (nuevoStock <= reorderPoint) {
      const alertContent =
        `⚠️ ALERTA DE INVENTARIO: ${med.brandName} — Stock bajo (${nuevoStock} unidades). ` +
        `Punto de reorden: ${reorderPoint}. Se requiere reabastecimiento.`;
        // Actualiza el INSERT
        operations.push({
          sql: `
            INSERT INTO CollaborativeNotes (patientId, authorId, noteContent, isAlert, alertTags, createdAt)
            VALUES (?, ?, ?, 1, 'STOCK', ?)
          `,
          args: [patientId, dispensedBy, alertContent, now],
        });
      alertaGenerada = true;
    }

    // Ejecutar todo como transacción atómica
    await db.batch(operations);

    return NextResponse.json(
      {
        data: {
          medicationId,
          prescriptionId,
          cantidadDespachada: quantity,
          stockResultante: nuevoStock,
          alertaStockGenerada: alertaGenerada,
          mensajeAlerta: alertaGenerada
            ? `Stock bajo el punto de reorden (${reorderPoint}). Se generó alerta automática.`
            : null,
        },
        error: null,
        status: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[BE-19] Error al dispensar medicamento:", error);
    return NextResponse.json(
      { data: null, error: "Error interno del servidor", status: 500 },
      { status: 500 }
    );
  }
}