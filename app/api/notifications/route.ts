// BE-14: POST /api/notifications
// Job programado: envía notificaciones 24h antes de la cita
// Llamado por Vercel Cron o node-cron cada hora
// Turso tables: Appointments, Users

import { NextResponse } from "next/server";
import { turso as db } from "@/app/turso";

export async function POST() {
  try {
    // Calcular ventana de tiempo: próximas 25 horas desde ahora
    const now = new Date();
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const nowISO = now.toISOString();
    const in25HoursISO = in25Hours.toISOString();

    // Buscar citas pendientes en las próximas 25h que NO tengan notificación enviada
    const { rows: appointments } = await db.execute({
      sql: `
        SELECT 
          a.appointmentId,
          a.dateTime,
          a.patientId,
          u.email,
          u.firstName,
          u.lastName
        FROM Appointments a
        JOIN Users u ON u.userId = a.patientId
        WHERE 
          a.status = 'Pendiente'
          AND a.dateTime > ?
          AND a.dateTime <= ?
          AND a.notificationSent = 0
      `,
      args: [nowISO, in25HoursISO],
    });

    let count = 0;

    for (const appt of appointments) {
      // Aquí iría la lógica de envío real (email, push, etc.)
      // Por ahora marcamos como enviada en la BD

      await db.execute({
        sql: `UPDATE Appointments SET notificationSent = 1 WHERE appointmentId = ?`,
        args: [appt.appointmentId],
      });

      count++;

      console.log(
        `[NOTIF] Cita ${appt.appointmentId} — ${appt.firstName} ${appt.lastName} — ${appt.dateTime}`
      );
    }

    return NextResponse.json(
      {
        data: { notificacionesEnviadas: count },
        error: null,
        status: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[BE-14] Error en notificaciones:", error);
    return NextResponse.json(
      { data: null, error: "Error interno del servidor", status: 500 },
      { status: 500 }
    );
  }
}