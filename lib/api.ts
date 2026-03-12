import { NextResponse } from "next/server";

export function apiResponse<T>(
  data: T | null,
  error: string | null,
  status: number
) {
  return NextResponse.json({ data, error, status }, { status });
}

export const ok          = <T>(data: T)        => apiResponse(data, null, 200);
export const created     = <T>(data: T)        => apiResponse(data, null, 201);
export const badRequest  = (msg: string)       => apiResponse(null, msg, 400);
export const unauthorized = ()                 => apiResponse(null, "No autorizado", 401);
export const forbidden   = (msg = "Acceso denegado") => apiResponse(null, msg, 403);
export const notFound    = (msg = "No encontrado")   => apiResponse(null, msg, 404);
export const conflict    = (msg: string)       => apiResponse(null, msg, 409);
export const serverError = (msg = "Error interno")   => apiResponse(null, msg, 500);