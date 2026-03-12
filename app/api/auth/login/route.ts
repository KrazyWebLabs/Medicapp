import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return badRequest("email y password son requeridos");
    }

    // 1. Buscar el usuario por email con su rol
    const result = await db.execute({
      sql: `SELECT u.userId, u.password, u.firstName, u.lastName,
                   r.roleId, r.roleName
            FROM Users u
            INNER JOIN Roles r ON u.roleId = r.roleId
            WHERE u.email = ?`,
      args: [email],
    });

    if (result.rows.length === 0) {
      return unauthorized();
    }

    const user = result.rows[0];

    // 2. Comparar contraseña con el hash guardado
    const passwordMatch = await bcrypt.compare(password, user.password as string);
    if (!passwordMatch) {
      return unauthorized();
    }

    // 3. Generar JWT con payload {userId, roleId, roleName}
    const token = jwt.sign(
      {
        userId: user.userId,
        roleId: user.roleId,
        roleName: user.roleName,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "8h" }
    );

    return ok({
      token,
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      roleName: user.roleName,
    });

  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return serverError();
  }
}