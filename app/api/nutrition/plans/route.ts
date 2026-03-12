import { NextRequest, NextResponse } from "next/server"
import { turso } from "@/app/turso"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      patientId,
      nutritionistId,
      caloricRequirement,
      macrosDistribution,
      weeklyMenu,
      equivalencesList,
      generalRecommendations,
      pdfUrl,
    } = body

    // Validate nutritional profile exists for this patient
    const profileResult = await turso.execute({
      sql: `SELECT profileId FROM NutritionalProfiles WHERE patientId = :patientId`,
      args: { patientId },
    })

    if (profileResult.rows.length === 0) {
      return NextResponse.json(
        { error: `No nutritional profile found for patient ${patientId}. Create a profile first.` },
        { status: 404 }
      )
    }

    // Validate weeklyMenu and equivalencesList are valid JSON
    try {
      JSON.parse(typeof weeklyMenu === "string" ? weeklyMenu : JSON.stringify(weeklyMenu))
      JSON.parse(typeof equivalencesList === "string" ? equivalencesList : JSON.stringify(equivalencesList))
    } catch {
      return NextResponse.json(
        { error: "weeklyMenu and equivalencesList must be valid JSON" },
        { status: 400 }
      )
    }

    const result = await turso.execute({
      sql: `
        INSERT INTO NutritionalPlans (
          patientId,
          nutritionistId,
          caloricRequirement,
          macrosDistribution,
          weeklyMenu,
          equivalencesList,
          generalRecommendations,
          pdfUrl,
          patientAccepted,
          creationDate
        ) VALUES (
          :patientId,
          :nutritionistId,
          :caloricRequirement,
          :macrosDistribution,
          :weeklyMenu,
          :equivalencesList,
          :generalRecommendations,
          :pdfUrl,
          0,
          DATE('now')
        )
      `,
      args: {
        patientId,
        nutritionistId,
        caloricRequirement,
        macrosDistribution,
        weeklyMenu: typeof weeklyMenu === "string" ? weeklyMenu : JSON.stringify(weeklyMenu),
        equivalencesList: typeof equivalencesList === "string" ? equivalencesList : JSON.stringify(equivalencesList),
        generalRecommendations: generalRecommendations ?? null,
        pdfUrl: pdfUrl ?? null,
      },
    })

    return NextResponse.json(
      {
        message: "Nutritional plan created successfully",
        planId: Number(result.lastInsertRowid),
        patientId,
        nutritionistId,
        patientAccepted: false,
      },
      { status: 201 }
    )
  } catch (_error) {
    console.error("Error creating nutritional plan:", _error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}