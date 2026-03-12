import { NextRequest, NextResponse } from "next/server"
import { turso } from "@/app/turso"
// Reemplaza el tipo del monthlyMap
type MonthlyEntry = {
  month: string
  withProgress: number
  withoutProgress: number
  discharged: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const nutritionistId = searchParams.get("nutritionistId")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const conditions: string[] = []
    const args: Record<string, string> = {}

    if (nutritionistId) {
      conditions.push("np.nutritionistId = :nutritionistId")
      args.nutritionistId = nutritionistId
    }

    if (from) {
      conditions.push("np.creationDate >= :from")
      args.from = from
    }

    if (to) {
      conditions.push("np.creationDate <= :to")
      args.to = to
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    // Get all plans with their last 2 follow-ups and discharge status
    const [plansResult, followUpsResult, dischargesResult] = await Promise.all([
      turso.execute({
        sql: `SELECT planId, patientId, nutritionistId, creationDate FROM NutritionalPlans np ${where}`,
        args,
      }),

      turso.execute({
        sql: `
          SELECT nf.planId, nf.currentBmi, nf.followUpDate
          FROM NutritionalFollowUps nf
          JOIN NutritionalPlans np ON nf.planId = np.planId
          ${where}
          ORDER BY nf.planId, nf.followUpDate ASC
        `,
        args,
      }),

      turso.execute({
        sql: `
          SELECT nd.planId, nd.goalReached, nd.dischargeDate
          FROM NutritionalDischarges nd
          JOIN NutritionalPlans np ON nd.planId = np.planId
          ${where}
        `,
        args,
      }),
    ])

    // Group follow-ups by planId
    const followUpsByPlan = followUpsResult.rows.reduce(
      (acc, row) => {
        const f = row as unknown as {
          planId: number
          currentBmi: number
          followUpDate: string
        }
        if (!acc[f.planId]) acc[f.planId] = []
        acc[f.planId].push(f)
        return acc
      },
      {} as Record<number, { planId: number; currentBmi: number; followUpDate: string }[]>
    )

    // Discharged planIds
    const dischargedPlanIds = new Set(
      dischargesResult.rows.map(
        (r) => (r as unknown as { planId: number }).planId
      )
    )

    // Classify each plan
    let withProgress = 0
    let withoutProgress = 0
    let discharged = 0
    let noFollowUps = 0

    // Monthly breakdown for recharts
    const monthlyMap: Record<string, MonthlyEntry> = {}

    for (const row of plansResult.rows) {
      const plan = row as unknown as {
        planId: number
        creationDate: string
      }

      const month = plan.creationDate.slice(0, 7) // YYYY-MM

      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, withProgress: 0, withoutProgress: 0, discharged: 0 }
      }

      if (dischargedPlanIds.has(plan.planId)) {
        discharged++
        monthlyMap[month].discharged++
        continue
      }

      const followUps = followUpsByPlan[plan.planId] ?? []

      if (followUps.length < 2) {
        noFollowUps++
        continue
      }

      // Check last 2 follow-ups — negative delta means improvement
      const last2 = followUps.slice(-2)
      const hasProgress = last2[1].currentBmi < last2[0].currentBmi

      if (hasProgress) {
        withProgress++
        monthlyMap[month].withProgress++
      } else {
        withoutProgress++
        monthlyMap[month].withoutProgress++
      }
    }

    const totalClassified = withProgress + withoutProgress + discharged

    return NextResponse.json(
      {
        summary: {
          totalPlans: plansResult.rows.length,
          withProgress,
          withoutProgress,
          discharged,
          noFollowUps,
          percentWithProgress:
            totalClassified > 0
              ? Math.round((withProgress / totalClassified) * 100 * 10) / 10
              : 0,
          percentWithoutProgress:
            totalClassified > 0
              ? Math.round((withoutProgress / totalClassified) * 100 * 10) / 10
              : 0,
          percentDischarged:
            totalClassified > 0
              ? Math.round((discharged / totalClassified) * 100 * 10) / 10
              : 0,
        },
        // Recharts-ready: pie chart data
        pieData: [
          { name: "With Progress", value: withProgress, fill: "#22c55e" },
          { name: "Without Progress", value: withoutProgress, fill: "#ef4444" },
          { name: "Discharged", value: discharged, fill: "#3b82f6" },
          { name: "No Follow-Ups Yet", value: noFollowUps, fill: "#94a3b8" },
        ],
        // Recharts-ready: bar chart data by month
        barData: Object.values(monthlyMap).sort((a, b) =>
          a.month.localeCompare(b.month)
        ),
      },
      { status: 200 }
    )
  } catch (_error) {
    console.error("Error generating nutrition report:", _error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}