import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { created, badRequest, conflict, serverError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      password,
      dateOfBirth,
      gender,
      bloodType,
      allergies,
      weight,
      height,
      isAthlete,
      schoolLevel,
    } = body;

    // 1. Validar campos obligatorios
    if (!firstName || !lastName || !email || !password) {
      return badRequest("firstName, lastName, email y password son requeridos");
    }

    // 2. Verificar que el email no esté registrado
    const existing = await db.execute({
      sql: `SELECT userId FROM Users WHERE email = ?`,
      args: [email],
    });

    if (existing.rows.length > 0) {
      return conflict("Ya existe una cuenta con ese email");
    }

    // 3. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Transacción atómica: insertar Users + Patients
    const batchResult = await db.batch([
      {
        sql: `INSERT INTO Users (firstName, lastName, email, password, roleId)
              VALUES (?, ?, ?, ?, (SELECT roleId FROM Roles WHERE roleName = 'Paciente'))`,
        args: [firstName, lastName, email, hashedPassword],
      },
      {
        sql: `INSERT INTO Patients (patientId, dateOfBirth, gender, bloodType, allergies, weight, height, isAthlete, schoolLevel)
              VALUES (last_insert_rowid(), ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          dateOfBirth ?? null,
          gender ?? null,
          bloodType ?? null,
          allergies ?? null,
          weight ?? null,
          height ?? null,
          isAthlete ?? 0,
          schoolLevel ?? null,
        ],
      },
    ]);

    return created({
      userId: Number(batchResult[0].lastInsertRowid),
      email,
      role: "Paciente",
    });

  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return serverError();
  }
}