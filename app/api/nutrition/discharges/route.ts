import { NextRequest, NextResponse } from "next/server"
import { turso } from "@/app/turso"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      planId,
      nutritionistNotes,
      finalWeight,
      goalAchieved,
    } = body

    // Get plan details
    const planResult = await turso.execute({
      sql: `
        SELECT planId, patientId, nutritionistId, creationDate, patientAccepted
        FROM NutritionalPlans
        WHERE planId = :planId
      `,
      args: { planId },
    })

    if (planResult.rows.length === 0) {
      return NextResponse.json(
        { error: `Plan ${planId} not found` },
        { status: 404 }
      )
    }

    const plan = planResult.rows[0] as unknown as {
      planId: number
      patientId: number
      nutritionistId: number
      creationDate: string
      patientAccepted: number
    }

    // Check if discharge already exists for this plan
    const existingDischarge = await turso.execute({
      sql: `SELECT dischargeId FROM NutritionalDischarges WHERE planId = :planId`,
      args: { planId },
    })

    if (existingDischarge.rows.length > 0) {
      return NextResponse.json(
        { error: `A discharge already exists for plan ${planId}` },
        { status: 409 }
      )
    }

    // Calculate treatmentDurationDays
    const creationDate = new Date(plan.creationDate)
    const dischargeDate = new Date()
    const treatmentDurationDays = Math.floor(
      (dischargeDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Insert discharge
    const dischargeResult = await turso.execute({
      sql: `
        INSERT INTO NutritionalDischarges (
          planId,
          goalReached,
          targetWeightAchieved,
          treatmentDurationDays,
          maintenanceRecommendations,
          dischargeReason,
          dischargeDate
        ) VALUES (
          :planId,
          :goalReached,
          :targetWeightAchieved,
          :treatmentDurationDays,
          :maintenanceRecommendations,
          :dischargeReason,
          DATE('now')
        )
      `,
      args: {
        planId,
        goalReached: goalAchieved ? 1 : 0,
        targetWeightAchieved: finalWeight ?? null,
        treatmentDurationDays,
        maintenanceRecommendations: nutritionistNotes ?? null,
        dischargeReason: body.dischargeReason ?? null,
      },
    })

    // Mark plan as completed
    await turso.execute({
      sql: `UPDATE NutritionalPlans SET patientAccepted = 1 WHERE planId = :planId`,
      args: { planId },
    })

    return NextResponse.json(
      {
        message: "Nutritional discharge registered successfully",
        summary: {
          dischargeId: Number(dischargeResult.lastInsertRowid),
          planId: plan.planId,
          patientId: plan.patientId,
          nutritionistId: plan.nutritionistId,
          creationDate: plan.creationDate,
          dischargeDate: dischargeDate.toISOString().split("T")[0],
          treatmentDurationDays,
          finalWeight: finalWeight ?? null,
          goalAchieved: goalAchieved ?? false,
          nutritionistNotes: nutritionistNotes ?? null,
        },
      },
      { status: 201 }
    )
  } catch (_error) {
    console.error("Error registering nutritional discharge:", _error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}