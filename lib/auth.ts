import { NextRequest } from "next/server";

export interface UserContext {
  userId: number;
  roleId: number;
  roleName: string;
}

export const ROLES = {
  ADMINISTRADOR: "Administrador",
  DOCTOR: "Doctor",
  NUTRIOLOGO: "Nutriólogo",
  PACIENTE: "Paciente",
} as const;

export const MEDICAL_ROLES = [
  ROLES.ADMINISTRADOR,
  ROLES.DOCTOR,
  ROLES.NUTRIOLOGO,
];

export function getUser(req: NextRequest): UserContext | null {
  const raw = req.headers.get("x-user-context");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserContext;
  } catch {
    return null;
  }
}