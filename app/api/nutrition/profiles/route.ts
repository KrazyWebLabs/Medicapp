import { NextRequest, NextResponse } from "next/server"
import { turso } from "@/app/turso"

function calculateBMI(weight: number, height: number) {
  const bmi = weight / (height * height)
  const rounded = Math.round(bmi * 10) / 10

  let classification: string
  if (bmi < 18.5) classification = "Bajo peso"
  else if (bmi < 25) classification = "Normal"
  else if (bmi < 30) classification = "Sobrepeso"
  else classification = "Obesidad"

  return { bmi: rounded, classification }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      patientId,
      nutritionistId,
      waistCircumference,
      bodyFatPercentage,
      physicalActivityLevel,
      familyHistory,
      dietaryRecall24h,
      consumptionFrequency,
      dietaryHabits,
      mealSchedule,
      waterConsumptionLiters,
      nutritionalObjective,
    } = body

    // Check if nutritionist role — only nutriologists can create
    const nutritionistResult = await turso.execute({
      sql: `SELECT roleId FROM Users WHERE userId = :nutritionistId`,
      args: { nutritionistId },
    })

    if (
      !nutritionistResult.rows[0] ||
      nutritionistResult.rows[0].roleId !== 4
    ) {
      return NextResponse.json(
        { error: "Only nutritionists can create nutritional profiles" },
        { status: 403 }
      )
    }

    // Check if profile already exists for this patient
    const existing = await turso.execute({
      sql: `SELECT profileId FROM NutritionalProfiles WHERE patientId = :patientId`,
      args: { patientId },
    })

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: `A nutritional profile already exists for patient ${patientId}` },
        { status: 409 }
      )
    }

    // Get patient weight and height to calculate BMI
    const patientResult = await turso.execute({
      sql: `SELECT weight, height FROM Patients WHERE patientId = :patientId`,
      args: { patientId },
    })

    if (!patientResult.rows[0]) {
      return NextResponse.json(
        { error: `Patient ${patientId} not found` },
        { status: 404 }
      )
    }

    const { weight, height } = patientResult.rows[0] as unknown as {
      weight: number
      height: number
    }

    const { bmi, classification } = calculateBMI(weight, height)

    // Determine metabolic risk based on BMI and waist circumference
    let metabolicRisk: string
    if (bmi >= 30 || waistCircumference > 88) metabolicRisk = "Alto"
    else if (bmi >= 25 || waistCircumference > 80) metabolicRisk = "Moderado"
    else metabolicRisk = "Bajo"

    // Insert new profile
    const result = await turso.execute({
      sql: `
        INSERT INTO NutritionalProfiles (
          patientId,
          waistCircumference,
          bodyFatPercentage,
          physicalActivityLevel,
          familyHistory,
          dietaryRecall24h,
          consumptionFrequency,
          dietaryHabits,
          mealSchedule,
          waterConsumptionLiters,
          nutritionalDiagnosis,
          metabolicRisk,
          nutritionalObjective,
          createdAt
        ) VALUES (
          :patientId,
          :waistCircumference,
          :bodyFatPercentage,
          :physicalActivityLevel,
          :familyHistory,
          :dietaryRecall24h,
          :consumptionFrequency,
          :dietaryHabits,
          :mealSchedule,
          :waterConsumptionLiters,
          :nutritionalDiagnosis,
          :metabolicRisk,
          :nutritionalObjective,
          CURRENT_TIMESTAMP
        )
      `,
      args: {
        patientId,
        waistCircumference,
        bodyFatPercentage,
        physicalActivityLevel,
        familyHistory,
        dietaryRecall24h,
        consumptionFrequency,
        dietaryHabits,
        mealSchedule,
        waterConsumptionLiters,
        nutritionalDiagnosis: classification,
        metabolicRisk,
        nutritionalObjective,
      },
    })

    return NextResponse.json(
      {
        message: "Nutritional profile created successfully",
        profileId: Number(result.lastInsertRowid),
        bmi: {
          value: bmi,
          classification,
        },
        metabolicRisk,
      },
      { status: 201 }
    )
  } catch (_error) {
    console.error("Error:", _error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}