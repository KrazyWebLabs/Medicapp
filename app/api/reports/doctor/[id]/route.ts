import { NextRequest, NextResponse } from "next/server"
import { turso } from "@/app/turso"

const periodFilter = (period: string | null) => {
  if (period === "week") return "AND c.consultationDate >= DATE('now', '-7 days')"
  if (period === "month") return "AND c.consultationDate >= DATE('now', '-1 month')"
  if (period === "year") return "AND c.consultationDate >= DATE('now', '-1 year')"
  return ""
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const period = request.nextUrl.searchParams.get("period")
  const filter = periodFilter(period)

  const result = await turso.execute({
    sql: `
      SELECT
        -- Total consultations
        (
          SELECT COUNT(*)
          FROM consultations c
          JOIN appointments a ON c.appointmentId = a.appointmentId
          WHERE a.doctorId = :id ${filter}
        ) as total_consultations,

        -- Total prescriptions
        (
          SELECT COUNT(*)
          FROM prescriptions p
          JOIN consultations c ON p.consultationId = c.consultationId
          JOIN appointments a ON c.appointmentId = a.appointmentId
          WHERE a.doctorId = :id ${filter}
        ) as total_prescriptions,

        -- Workload by period
        (
          SELECT JSON_GROUP_ARRAY(
            JSON_OBJECT('period', period, 'total', total)
          )
          FROM (
            SELECT strftime('%Y-%m', c.consultationDate) as period, COUNT(*) as total
            FROM consultations c
            JOIN appointments a ON c.appointmentId = a.appointmentId
            WHERE a.doctorId = :id ${filter}
            GROUP BY period
            ORDER BY period ASC
          )
        ) as workload,

        -- Top 5 diagnoses
        (
          SELECT JSON_GROUP_ARRAY(
            JSON_OBJECT('diagnosis', diagnosis, 'frequency', frequency)
          )
          FROM (
            SELECT c.diagnosis, COUNT(*) as frequency
            FROM consultations c
            JOIN appointments a ON c.appointmentId = a.appointmentId
            WHERE a.doctorId = :id ${filter}
            GROUP BY c.diagnosis
            ORDER BY frequency DESC
            LIMIT 5
          )
        ) as top_diagnoses,

        -- Top 5 medications prescribed
        (
          SELECT JSON_GROUP_ARRAY(
            JSON_OBJECT('medicationId', medicationId, 'frequency', frequency)
          )
          FROM (
            SELECT p.medicationId, COUNT(*) as frequency
            FROM prescriptions p
            JOIN consultations c ON p.consultationId = c.consultationId
            JOIN appointments a ON c.appointmentId = a.appointmentId
            WHERE a.doctorId = :id ${filter}
            GROUP BY p.medicationId
            ORDER BY frequency DESC
            LIMIT 5
          )
        ) as top_medications
    `,
    args: { id },
  })

  const row = result.rows[0]

  return NextResponse.json({
    doctorId: id,
    period: period ?? "all",
    total_consultations: row.total_consultations,
    total_prescriptions: row.total_prescriptions,
    workload: JSON.parse(row.workload as string),
    top_diagnoses: JSON.parse(row.top_diagnoses as string),
    top_medications: JSON.parse(row.top_medications as string),
  }, { status: 200 })
}
