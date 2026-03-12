import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { ok, badRequest, unauthorized, serverError } from "@/lib/api";

//Monarchh

function generateSlots(date: string): string[] {
  const slots: string[] = [];
  const [year, month, day] = date.split("-").map(Number);

  for (let hour = 8; hour < 18; hour++) {
    for (const min of [0, 30]) {
      const slot = new Date(Date.UTC(year, month - 1, day, hour, min));
      slots.push(slot.toISOString());
    }
  }
  return slots;
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("doctorId");
  const date = searchParams.get("date");

  if (!doctorId || !date) {
    return badRequest("Se requieren los parámetros doctorId y date (YYYY-MM-DD)");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return badRequest("El parámetro date debe tener formato YYYY-MM-DD");
  }

  try {
    const occupied = await db.execute({
      sql: `SELECT dateTime FROM Appointments
            WHERE doctorId = ? AND DATE(dateTime) = ? AND status != 'Cancelada'`,
      args: [doctorId, date],
    });

    const occupiedSet = new Set(
      occupied.rows.map((r) => new Date(r.dateTime as string).toISOString())
    );

    const allSlots = generateSlots(date);
    const freeSlots = allSlots.filter((slot) => !occupiedSet.has(slot));

    return ok({
      doctorId: Number(doctorId),
      date,
      availableSlots: freeSlots,
      totalFree: freeSlots.length,
      message: freeSlots.length === 0 ? "No hay slots disponibles para esta fecha" : null,
    });

  } catch (err) {
    console.error("[GET /api/appointments/available]", err);
    return serverError();
  }
}