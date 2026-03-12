import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUser, MEDICAL_ROLES } from "@/lib/auth";
import { created, badRequest, forbidden, unauthorized, notFound, serverError } from "@/lib/api";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

//  Subir archivo clínico
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return unauthorized();

  if (!MEDICAL_ROLES.includes(user.roleName as never)) {
    return forbidden("Solo roles médicos pueden subir archivos clínicos");
  }

  const { id } = await params;
  const consultationId = Number(id);
  if (isNaN(consultationId)) return badRequest("ID de consulta inválido");

  try {
    // 1. Verificar que la consulta existe
    const consult = await db.execute({
      sql: `SELECT consultationId FROM Consultations WHERE consultationId = ?`,
      args: [consultationId],
    });

    if (consult.rows.length === 0) return notFound("Consulta no encontrada");

    // 2. Leer el archivo del form-data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fileType = formData.get("fileType") as string | null;

    if (!file) return badRequest("Se requiere el campo 'file'");
    if (!fileType) return badRequest("Se requiere el campo 'fileType' (ej: 'Rayos X', 'PDF Receta')");

    // 3. Validar tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return badRequest(
        `Tipo de archivo no permitido. Tipos válidos: ${ALLOWED_MIME_TYPES.join(", ")}`
      );
    }

    // 4. Validar tamaño máximo
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return badRequest("El archivo excede el tamaño máximo de 10 MB");
    }

    // 5. Aquí iría la subida al storage (S3, Cloudflare R2, etc.)
    //    Por ahora generamos la URL que tendría en producción
    const fileUrl = `https://storage.medicapp.com/consultations/${consultationId}/${Date.now()}-${file.name}`;

    // 6. Registrar en base de datos
    const result = await db.execute({
      sql: `INSERT INTO ClinicalFiles (consultationId, fileType, fileUrl)
            VALUES (?, ?, ?)`,
      args: [consultationId, fileType, fileUrl],
    });

    return created({
      fileId: Number(result.lastInsertRowid),
      consultationId,
      fileType,
      fileUrl,
      fileName: file.name,
      fileSizeBytes: file.size,
    });

  } catch (err) {
    console.error("[POST /api/consultations/:id/files]", err);
    return serverError();
  }
}

// Función para registrar intentos de modificación o eliminación de consultas, que son inmutables

async function logViolation(consultationId: number, userId: number, method: string) {
  try {
    await db.execute({
      sql: `INSERT INTO CollaborativeNotes (patientId, authorId, noteContent, isAlert, alertTags, createdAt)
            SELECT
              a.patientId,
              ?,
              ?,
              1,
              'inmutabilidad,seguridad',
              CURRENT_TIMESTAMP
            FROM Consultations c
            INNER JOIN Appointments a ON c.appointmentId = a.appointmentId
            WHERE c.consultationId = ?`,
      args: [
        userId,
        `ALERTA: Intento de ${method} sobre consultationId=${consultationId} por userId=${userId}. Bloqueado por inmutabilidad.`,
        consultationId,
      ],
    });
  } catch {
    console.error("[INMUTABILIDAD] Falló el registro de alerta");
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  const { id } = await params;
  if (user) await logViolation(Number(id), user.userId, "PUT");
  return forbidden("Las consultas son registros inmutables. No se permite su modificación.");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  const { id } = await params;
  if (user) await logViolation(Number(id), user.userId, "DELETE");
  return forbidden("Las consultas son registros inmutables. No se permite su eliminación.");
}