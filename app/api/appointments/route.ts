import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { created, badRequest, unauthorized, conflict, serverError } from "@/lib/api";

//Monarch

export async function POST(req: NextRequest) {
  // Verifica usuario autenticado
  const user = getUser(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { patientId, doctorId, dateTime } = body;

    // Valida datos completos jiji
    if (!patientId || !doctorId || !dateTime) {
      return badRequest("patientId, doctorId y dateTime son requeridos");
    }

    // Verifica que no haya citas en el mismo horario
    const existing = await db.execute({
      sql: `SELECT appointmentId FROM Appointments
            WHERE doctorId = ? AND dateTime = ? AND status != 'Cancelada'`,
      args: [doctorId, dateTime],
    });

    if (existing.rows.length > 0) {
      return conflict("El doctor ya tiene una cita en ese horario");
    }

    // Inserta la cita
    const result = await db.execute({
      sql: `INSERT INTO Appointments (patientId, doctorId, dateTime, status)
            VALUES (?, ?, ?, 'Pendiente')`,
      args: [patientId, doctorId, dateTime],
    });

    return created({
      appointmentId: Number(result.lastInsertRowid),
      patientId,
      doctorId,
      dateTime,
      status: "Pendiente",
    });

  } catch (err) {
    console.error("[POST /api/appointments]", err);
    return serverError();
  }
}