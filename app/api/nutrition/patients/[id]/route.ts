import { NextRequest, NextResponse } from "next/server"
import { turso } from "@/app/turso"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get nutritional profile
    const profileResult = await turso.execute({
      sql: `SELECT * FROM NutritionalProfiles WHERE patientId = :id`,
      args: { id },
    })

    if (profileResult.rows.length === 0) {
      return NextResponse.json(
        { error: `No nutritional profile found for patient ${id}` },
        { status: 404 }
      )
    }

    // Get all plans + discharge (if exists) + follow-ups ordered by date
    const [plansResult, followUpsResult] = await Promise.all([
      turso.execute({
        sql: `
          SELECT
            np.*,
            nd.dischargeId,
            nd.goalReached,
            nd.targetWeightAchieved,
            nd.treatmentDurationDays,
            nd.maintenanceRecommendations,
            nd.dischargeReason,
            nd.dischargeDate
          FROM NutritionalPlans np
          LEFT JOIN NutritionalDischarges nd ON np.planId = nd.planId
          WHERE np.patientId = :id
          ORDER BY np.creationDate ASC
        `,
        args: { id },
      }),

      turso.execute({
        sql: `
          SELECT nf.*
          FROM NutritionalFollowUps nf
          JOIN NutritionalPlans np ON nf.planId = np.planId
          WHERE np.patientId = :id
          ORDER BY nf.followUpDate ASC
        `,
        args: { id },
      }),
    ])

    // Group follow-ups by planId
    const followUpsByPlan = followUpsResult.rows.reduce(
      (acc, followUp) => {
        const f = followUp as unknown as { planId: number }
        if (!acc[f.planId]) acc[f.planId] = []
        acc[f.planId].push(followUp)
        return acc
      },
      {} as Record<number, typeof followUpsResult.rows>
    )

    // Build plans with their follow-ups and discharge
    const plans = plansResult.rows.map((row) => {
      const plan = row as unknown as {
        planId: number
        patientId: number
        nutritionistId: number
        caloricRequirement: number
        macrosDistribution: string
        weeklyMenu: string
        equivalencesList: string
        generalRecommendations: string
        pdfUrl: string
        patientAccepted: number
        creationDate: string
        dischargeId: number | null
        goalReached: number | null
        targetWeightAchieved: number | null
        treatmentDurationDays: number | null
        maintenanceRecommendations: string | null
        dischargeReason: string | null
        dischargeDate: string | null
      }

      return {
        planId: plan.planId,
        nutritionistId: plan.nutritionistId,
        caloricRequirement: plan.caloricRequirement,
        macrosDistribution: plan.macrosDistribution,
        weeklyMenu: plan.weeklyMenu,
        equivalencesList: plan.equivalencesList,
        generalRecommendations: plan.generalRecommendations,
        pdfUrl: plan.pdfUrl,
        patientAccepted: plan.patientAccepted === 1,
        creationDate: plan.creationDate,
        followUps: followUpsByPlan[plan.planId] ?? [],
        discharge: plan.dischargeId
          ? {
              dischargeId: plan.dischargeId,
              goalReached: plan.goalReached === 1,
              targetWeightAchieved: plan.targetWeightAchieved,
              treatmentDurationDays: plan.treatmentDurationDays,
              maintenanceRecommendations: plan.maintenanceRecommendations,
              dischargeReason: plan.dischargeReason,
              dischargeDate: plan.dischargeDate,
            }
          : null,
      }
    })

    return NextResponse.json(
      {
        patientId: id,
        profile: profileResult.rows[0],
        totalPlans: plans.length,
        plans,
      },
      { status: 200 }
    )
  } catch (_error) {
    console.error("Error fetching nutritional history:", _error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}