import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUser, ROLES } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, conflict, serverError } from "@/lib/api";

//Monarchh


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  const appointmentId = Number(id);
  if (isNaN(appointmentId)) return badRequest("ID de cita inválido");

  try {
    const body = await req.json();
    const { status, dateTime } = body;

    if (!status && !dateTime) {
      return badRequest("Se requiere al menos status o dateTime para actualizar");
    }

    // 1. Buscar la cita
    const result = await db.execute({
      sql: `SELECT appointmentId, patientId, doctorId, status, dateTime
            FROM Appointments WHERE appointmentId = ?`,
      args: [appointmentId],
    });

    if (result.rows.length === 0) return notFound("Cita no encontrada");
    const appt = result.rows[0];

    // 2. No se puede tocar una cita completada
    if (appt.status === "Completada") {
      return conflict("No se puede modificar una cita ya completada");
    }

    // 3. Solo el paciente dueño o admin pueden modificarla
    const isOwner = user.userId === Number(appt.patientId);
    const isAdmin = user.roleName === ROLES.ADMINISTRADOR;
    if (!isOwner && !isAdmin) {
      return forbidden("Solo el paciente dueño o un administrador puede modificar esta cita");
    }

    // 4. Si cambia la hora, verificar que el nuevo slot esté libre
    if (dateTime && dateTime !== appt.dateTime) {
      const slotTaken = await db.execute({
        sql: `SELECT appointmentId FROM Appointments
              WHERE doctorId = ? AND dateTime = ?
              AND appointmentId != ? AND status != 'Cancelada'`,
        args: [appt.doctorId, dateTime, appointmentId],
      });
      if (slotTaken.rows.length > 0) return conflict("El nuevo horario ya está ocupado");
    }

    // 5. Actualizar solo los campos que llegaron
    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (status) { updates.push("status = ?"); args.push(status); }
    if (dateTime) { updates.push("dateTime = ?"); args.push(dateTime); }
    args.push(appointmentId);

    await db.execute({
      sql: `UPDATE Appointments SET ${updates.join(", ")} WHERE appointmentId = ?`,
      args,
    });

    return ok({
      appointmentId,
      updated: { status, dateTime },
      message: status === "Cancelada"
        ? "Cita cancelada. El slot quedó liberado."
        : "Cita actualizada correctamente.",
    });

  } catch (err) {
    console.error("[PATCH /api/appointments/:id]", err);
    return serverError();
  }
}