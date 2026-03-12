import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUser, MEDICAL_ROLES } from "@/lib/auth";
import { created, badRequest, unauthorized, forbidden, notFound, conflict, serverError } from "@/lib/api";

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return unauthorized();

  // Solo médicos pueden crear consultas
  if (!MEDICAL_ROLES.includes(user.roleName as never)) {
    return forbidden("Solo roles médicos pueden crear consultas");
  }

  try {
    const body = await req.json();
    const { appointmentId, diagnosis, symptoms, consultationDate } = body;

    if (!appointmentId || !consultationDate) {
      return badRequest("appointmentId y consultationDate son requeridos");
    }

    // 1. Verificar que la cita existe
    const apptResult = await db.execute({
      sql: `SELECT appointmentId, status FROM Appointments WHERE appointmentId = ?`,
      args: [appointmentId],
    });

    if (apptResult.rows.length === 0) {
      return notFound("La cita no existe");
    }

    const appt = apptResult.rows[0];

    // 2. Verificar que la cita no esté cancelada o ya completada
    if (appt.status === "Cancelada") {
      return conflict("No se puede crear una consulta para una cita cancelada");
    }

    if (appt.status === "Completada") {
      return conflict("Esta cita ya tiene una consulta registrada");
    }

    // 3. Transacción atómica: insertar consulta + marcar cita como Completada
    const batchResult = await db.batch([
      {
        sql: `INSERT INTO Consultations (appointmentId, diagnosis, symptoms, consultationDate)
              VALUES (?, ?, ?, ?)`,
        args: [appointmentId, diagnosis ?? null, symptoms ?? null, consultationDate],
      },
      {
        sql: `UPDATE Appointments SET status = 'Completada' WHERE appointmentId = ?`,
        args: [appointmentId],
      },
    ]);

    return created({
      consultationId: Number(batchResult[0].lastInsertRowid),
      appointmentId,
      diagnosis,
      symptoms,
      consultationDate,
      appointmentStatus: "Completada",
    });

  } catch (err) {
    console.error("[POST /api/consultations]", err);
    return serverError();
  }
}