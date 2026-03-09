import { NextRequest, NextResponse } from "next/server";
import { agendaSeed } from "@/lib/seeders/agenda";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matricula_doctor: string }> }
) {
  const { matricula_doctor } = await params;
  const fecha = request.nextUrl.searchParams.get("fecha");

  let citas = agendaSeed.filter(
    (c) => c.matricula_doctor === matricula_doctor
  );

  if (fecha) {
    citas = citas.filter((c) => c.fecha === fecha);
  }

  if (citas.length === 0) {
    return NextResponse.json(
      { error: `No se encontraron citas para el doctor ${matricula_doctor}` },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      matricula_doctor,
      fecha: fecha ?? "todas",
      total: citas.length,
      agenda: citas,
    },
    { status: 200 }
  );
}