import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUser, MEDICAL_ROLES } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api";

//Monarch

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  const user = getUser(req);
  if (!user) return unauthorized();

  // Solo roles médicos pueden ver agendas
  if (!MEDICAL_ROLES.includes(user.roleName as never)) {
    return forbidden("Solo roles médicos pueden consultar agendas");
  }

  const { doctorId } = await params;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return badRequest("El parámetro date debe tener formato YYYY-MM-DD");
  }

  try {
    const result = await db.execute({
      sql: `SELECT
              a.appointmentId,
              a.dateTime,
              a.status,
              a.patientId,
              u.firstName || ' ' || u.lastName AS patientFullName,
              u.email AS patientEmail,
              p.bloodType,
              p.allergies
            FROM Appointments a
            INNER JOIN Users u ON a.patientId = u.userId
            INNER JOIN Patients p ON a.patientId = p.patientId
            WHERE a.doctorId = ? AND DATE(a.dateTime) = ?
            ORDER BY a.dateTime ASC`,
      args: [doctorId, date],
    });

    return ok({
      doctorId: Number(doctorId),
      date,
      totalAppointments: result.rows.length,
      agenda: result.rows.map((r) => ({
        appointmentId: r.appointmentId,
        dateTime: r.dateTime,
        status: r.status,
        patient: {
          patientId: r.patientId,
          fullName: r.patientFullName,
          email: r.patientEmail,
          bloodType: r.bloodType,
          allergies: r.allergies,
        },
      })),
    });

  } catch (err) {
    console.error("[GET /api/appointments/doctor/:doctorId]", err);
    return serverError();
  }
}
