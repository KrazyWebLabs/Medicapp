import { NextRequest, NextResponse } from "next/server"
import { turso } from "@/app/turso"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const conditions: string[] = []
  const args: Record<string, string> = {}

  if (from) {
    conditions.push("c.consultationDate >= :from")
    args.from = from
  }

  if (to) {
    conditions.push("c.consultationDate <= :to")
    args.to = to
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const [daily, weekly, monthly, topDiagnoses] = await Promise.all([
    turso.execute({
      sql: `
        SELECT DATE(c.consultationDate) as day, COUNT(*) as total
        FROM consultations c
        JOIN appointments a ON c.appointmentId = a.appointmentId
        ${where}
        GROUP BY day ORDER BY day ASC
      `,
      args,
    }),

    turso.execute({
      sql: `
        SELECT strftime('%Y-W%W', c.consultationDate) as week, COUNT(*) as total
        FROM consultations c
        JOIN appointments a ON c.appointmentId = a.appointmentId
        ${where}
        GROUP BY week ORDER BY week ASC
      `,
      args,
    }),

    turso.execute({
      sql: `
        SELECT strftime('%Y-%m', c.consultationDate) as month, COUNT(*) as total
        FROM consultations c
        JOIN appointments a ON c.appointmentId = a.appointmentId
        ${where}
        GROUP BY month ORDER BY month ASC
      `,
      args,
    }),

    turso.execute({
      sql: `
        SELECT c.diagnosis, COUNT(*) as frequency
        FROM consultations c
        JOIN appointments a ON c.appointmentId = a.appointmentId
        ${where}
        GROUP BY c.diagnosis
        ORDER BY frequency DESC
        LIMIT 5
      `,
      args,
    }),
  ])

  return NextResponse.json({
    traffic: {
      daily: daily.rows,
      weekly: weekly.rows,
      monthly: monthly.rows,
    },
    top_diagnoses: topDiagnoses.rows,
  }, { status: 200 })
}