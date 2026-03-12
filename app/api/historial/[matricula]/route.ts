import { NextRequest, NextResponse } from "next/server";
import { historialSeed } from "@/lib/seeders/historial";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matricula: string }> }
) {
  const { matricula } = await params;

  const consultas = historialSeed.filter(
    (c) => c.matricula_paciente === matricula
  );

  if (consultas.length === 0) {
    return NextResponse.json(
      { error: `No se encontró historial para la matrícula ${matricula}` },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      matricula,
      total: consultas.length,
      historial: consultas,
    },
    { status: 200 }
  );
}