import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getUser, ROLES } from "@/lib/auth";
import { created, badRequest, unauthorized, forbidden, conflict, serverError } from "@/lib/api";

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return unauthorized();

  // Solo Administrador puede crear doctores
  if (user.roleName !== ROLES.ADMINISTRADOR) {
    return forbidden("Solo un administrador puede crear doctores");
  }

  try {
    const body = await req.json();
    const { firstName, lastName, email, password, roleName } = body;

    // 1. Validar campos obligatorios
    if (!firstName || !lastName || !email || !password || !roleName) {
      return badRequest("firstName, lastName, email, password y roleName son requeridos");
    }

    // 2. Validar que el rol sea Doctor o Nutriólogo
    const validRoles = [ROLES.DOCTOR, ROLES.NUTRIOLOGO];
    if (!validRoles.includes(roleName)) {
      return badRequest("roleName debe ser Doctor o Nutriólogo");
    }

    // 3. Verificar email duplicado
    const existing = await db.execute({
      sql: `SELECT userId FROM Users WHERE email = ?`,
      args: [email],
    });

    if (existing.rows.length > 0) {
      return conflict("Ya existe una cuenta con ese email");
    }

    // 4. Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Insertar usuario con el rol correcto
    const result = await db.execute({
      sql: `INSERT INTO Users (firstName, lastName, email, password, roleId)
            VALUES (?, ?, ?, ?, (SELECT roleId FROM Roles WHERE roleName = ?))`,
      args: [firstName, lastName, email, hashedPassword, roleName],
    });

    return created({
      userId: Number(result.lastInsertRowid),
      email,
      roleName,
    });

  } catch (err) {
    console.error("[POST /api/doctors]", err);
    return serverError();
  }
}