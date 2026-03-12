import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUser, MEDICAL_ROLES } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return unauthorized();

  // Solo roles médicos pueden ver perfiles de pacientes
  if (!MEDICAL_ROLES.includes(user.roleName as never)) {
    return forbidden("Solo roles médicos pueden ver perfiles de pacientes");
  }

  const { id } = await params;
  const patientId = Number(id);
  if (isNaN(patientId)) return badRequest("ID de paciente inválido");

  try {
    const result = await db.execute({
      sql: `SELECT
              u.userId,
              u.firstName,
              u.lastName,
              u.email,
              r.roleName,
              p.dateOfBirth,
              p.gender,
              p.bloodType,
              p.allergies,
              p.weight,
              p.height,
              p.isAthlete,
              p.schoolLevel
            FROM Users u
            INNER JOIN Patients p ON u.userId = p.patientId
            INNER JOIN Roles r ON u.roleId = r.roleId
            WHERE u.userId = ?`,
      args: [patientId],
    });

    if (result.rows.length === 0) {
      return notFound("Paciente no encontrado");
    }

    return ok(result.rows[0]);

  } catch (err) {
    console.error("[GET /api/patients/:id]", err);
    return serverError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  const patientId = Number(id);
  if (isNaN(patientId)) return badRequest("ID de paciente inválido");

  try {
    const body = await req.json();
    const { email, phone } = body;

    // 1. Verificar que el paciente existe
    const existing = await db.execute({
      sql: `SELECT userId FROM Users WHERE userId = ?`,
      args: [patientId],
    });

    if (existing.rows.length === 0) {
      return notFound("Paciente no encontrado");
    }

    // 2. Solo el mismo paciente puede editar sus datos no clínicos
    //    Los doctores pueden editar todo
    const isOwner = user.userId === patientId;
    const isMedical = MEDICAL_ROLES.includes(user.roleName as never);

    if (!isOwner && !isMedical) {
      return forbidden("No tienes permiso para editar este perfil");
    }

    // 3. Campos no clínicos — solo estos puede editar el paciente
    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (email) { updates.push("email = ?"); args.push(email); }
    if (phone) { updates.push("phone = ?"); args.push(phone); }

    if (updates.length === 0) {
      return badRequest("No hay campos válidos para actualizar");
    }

    args.push(patientId);

    await db.execute({
      sql: `UPDATE Users SET ${updates.join(", ")} WHERE userId = ?`,
      args,
    });

    return ok({
      userId: patientId,
      updated: { email, phone },
      message: "Perfil actualizado correctamente",
    });

  } catch (err) {
    console.error("[PATCH /api/patients/:id]", err);
    return serverError();
  }
}