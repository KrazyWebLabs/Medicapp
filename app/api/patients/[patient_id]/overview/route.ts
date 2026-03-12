import { NextRequest, NextResponse } from "next/server";
import { turso } from "@/app/turso";

export async function GET(
  req: NextRequest,
  { params }: { params: { patient_id: string } }
) {
  const patientId = params.patient_id;

  try {
    const patientResult = await turso.execute({
      sql: `SELECT p.*, u.firstName, u.lastName, u.email
            FROM Patients p
            JOIN Users u ON p.patientId = u.userId
            WHERE p.patientId = ?`,
      args: [patientId],
    });

    if (patientResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Paciente no encontrado" },
        { status: 404 }
      );
    }

    const consultationsResult = await turso.execute({
      sql: `SELECT c.*, a.dateTime, a.status
            FROM Consultations c
            JOIN Appointments a ON c.appointmentId = a.appointmentId
            WHERE a.patientId = ?
            ORDER BY c.consultationDate DESC
            LIMIT 3`,
      args: [patientId],
    });

    const nutritionResult = await turso.execute({
      sql: `SELECT * FROM NutritionalProfiles WHERE patientId = ? LIMIT 1`,
      args: [patientId],
    });

    const followUpsResult = await turso.execute({
      sql: `SELECT nf.*
            FROM NutritionalFollowUps nf
            JOIN NutritionalPlans np ON nf.planId = np.planId
            WHERE np.patientId = ?
            ORDER BY nf.followUpDate DESC
            LIMIT 5`,
      args: [patientId],
    });

    const alertsResult = await turso.execute({
      sql: `SELECT cn.*, u.firstName as authorFirstName, u.lastName as authorLastName
            FROM CollaborativeNotes cn
            JOIN Users u ON cn.authorId = u.userId
            WHERE cn.patientId = ? AND cn.isAlert = 1
            ORDER BY cn.createdAt DESC`,
      args: [patientId],
    });

    return NextResponse.json(
      {
        clinical: {
          ...patientResult.rows[0],
          consultations: consultationsResult.rows,
        },
        nutrition: {
          profile: nutritionResult.rows[0] ?? null,
          followUps: followUpsResult.rows,
        },
        alerts: alertsResult.rows,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[BE-29] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}