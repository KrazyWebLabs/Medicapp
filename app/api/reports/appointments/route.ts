import { NextRequest, NextResponse } from "next/server"
import { turso } from "@/app/turso"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const doctorId = searchParams.get("doctorId")

  const conditions: string[] = []
  const args: Record<string, string> = {}

  if (from) {
    conditions.push("dateTime >= :from")
    args.from = from
  }

  if (to) {
    conditions.push("dateTime <= :to")
    args.to = to
  }

  if (doctorId) {
    conditions.push("doctorId = :doctorId")
    args.doctorId = doctorId
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const result = await turso.execute({
    sql: `
      SELECT
        doctorId,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completada' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelada' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'pendiente' THEN 1 ELSE 0 END) as pending,
        ROUND(100.0 * SUM(CASE WHEN status = 'completada' THEN 1 ELSE 0 END) / COUNT(*), 2) as completion_rate,
        ROUND(100.0 * SUM(CASE WHEN status = 'cancelada' THEN 1 ELSE 0 END) / COUNT(*), 2) as cancellation_rate
      FROM appointments
      ${where}
      GROUP BY doctorId
    `,
    args,
  })

  return NextResponse.json(result.rows, { status: 200 })
}