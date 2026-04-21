import { NextRequest, NextResponse } from "next/server"
import { turso } from "@/app/turso"

function calculateBMI(weight: number, height: number) {
  const bmi = weight / (height * height)
  return Math.round(bmi * 10) / 10
}

function classifyBMI(bmi: number) {
  if (bmi < 18.5) return "Underweight"
  if (bmi < 25) return "Normal"
  if (bmi < 30) return "Overweight"
  return "Obese"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      planId,
      consultationId,
      currentWeight,
      bodyMeasurements,
      compliancePercentage,
      adjustmentsMade,
      newGoals,
    } = body

    // Get plan → patientId
    const planResult = await turso.execute({
      sql: `SELECT patientId, nutritionistId FROM NutritionalPlans WHERE planId = :planId`,
      args: { planId },
    })

    if (planResult.rows.length === 0) {
      return NextResponse.json(
        { error: `Plan ${planId} not found` },
        { status: 404 }
      )
    }

    const { patientId, nutritionistId } = planResult.rows[0] as unknown as {
      patientId: number
      nutritionistId: number
    }

    // Get patient height + initial BMI from profile
    const profileResult = await turso.execute({
      sql: `
        SELECT np.nutritionalDiagnosis, p.height, p.weight as initialWeight
        FROM NutritionalProfiles np
        JOIN Patients p ON np.patientId = p.patientId
        WHERE np.patientId = :patientId
      `,
      args: { patientId },
    })

    if (profileResult.rows.length === 0) {
      return NextResponse.json(
        { error: `No nutritional profile found for patient ${patientId}` },
        { status: 404 }
      )
    }

    const { height, initialWeight } = profileResult.rows[0] as unknown as {
      height: number
      initialWeight: number
    }

    // Calculate BMIs
    const initialBMI = calculateBMI(initialWeight, height)
    const currentBMI = calculateBMI(currentWeight, height)
    const deltaBMI = Math.round((currentBMI - initialBMI) * 10) / 10

    // Insert follow-up
    const followUpResult = await turso.execute({
      sql: `
        INSERT INTO NutritionalFollowUps (
          planId,
          consultationId,
          currentWeight,
          currentBmi,
          bodyMeasurements,
          compliancePercentage,
          adjustmentsMade,
          newGoals,
          followUpDate
        ) VALUES (
          :planId,
          :consultationId,
          :currentWeight,
          :currentBMI,
          :bodyMeasurements,
          :compliancePercentage,
          :adjustmentsMade,
          :newGoals,
          DATE('now')
        )
      `,
      args: {
        planId,
        consultationId,
        currentWeight,
        currentBMI,
        bodyMeasurements: typeof bodyMeasurements === "string"
          ? bodyMeasurements
          : JSON.stringify(bodyMeasurements),
        compliancePercentage,
        adjustmentsMade: adjustmentsMade ?? null,
        newGoals: newGoals ?? null,
      },
    })

    // Check last 2 follow-ups for lack of progress (deltaBMI >= 0 means no improvement)
    const recentFollowUps = await turso.execute({
      sql: `
        SELECT currentBmi
        FROM NutritionalFollowUps
        WHERE planId = :planId
        ORDER BY followUpDate DESC
        LIMIT 2
      `,
      args: { planId },
    })

    let alertCreated = false

    if (recentFollowUps.rows.length === 2) {
      const bmis = recentFollowUps.rows.map(
        (r) => (r as unknown as { currentBmi: number }).currentBmi
      )
      const noProgress = bmis.every((bmi) => bmi >= initialBMI)

      if (noProgress) {
        await turso.execute({
          sql: `
            INSERT INTO CollaborativeNotes (
              patientId,
              authorId,
              note,
              isAlert,
              createdAt
            ) VALUES (
              :patientId,
              :nutritionistId,
              :note,
              1,
              CURRENT_TIMESTAMP
            )
          `,
          args: {
            patientId,
            nutritionistId,
            note: `Patient ${patientId} has shown no BMI progress in the last 2 follow-ups. Initial BMI: ${initialBMI}. Latest BMI: ${currentBMI}. Review plan ${planId}.`,
          },
        })
        alertCreated = true
      }
    }

    return NextResponse.json(
      {
        message: "Follow-up registered successfully",
        followUpId: Number(followUpResult.lastInsertRowid),
        bmi: {
          initial: initialBMI,
          current: currentBMI,
          delta: deltaBMI,
          classification: classifyBMI(currentBMI),
        },
        alertCreated,
      },
      { status: 201 }
    )
  } catch (_error) {
    console.error("Error creating follow-up:", _error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}