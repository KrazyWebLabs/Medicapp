import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUser, MEDICAL_ROLES } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  const patientId = Number(id);
  if (isNaN(patientId)) return badRequest("ID de paciente inválido");

  const isMedical = MEDICAL_ROLES.includes(user.roleName as never);
  const isOwnRecord = user.userId === patientId;

  if (!isMedical && !isOwnRecord) {
    return forbidden("No tienes permiso para ver este historial");
  }

  try {
    // 1. Todas las consultas del paciente
    const consultations = await db.execute({
      sql: `SELECT
              c.consultationId,
              c.diagnosis,
              c.symptoms,
              c.consultationDate,
              a.appointmentId,
              a.dateTime AS appointmentDateTime,
              a.doctorId,
              u.firstName || ' ' || u.lastName AS doctorFullName
            FROM Consultations c
            INNER JOIN Appointments a ON c.appointmentId = a.appointmentId
            INNER JOIN Users u ON a.doctorId = u.userId
            WHERE a.patientId = ?
            ORDER BY c.consultationDate DESC`,
      args: [patientId],
    });

    if (consultations.rows.length === 0) {
      return ok({ patientId, totalConsultations: 0, history: [] });
    }

    // 2. IDs de todas las consultas
    const consultationIds = consultations.rows.map((r) => r.consultationId as number);
    const placeholders = consultationIds.map(() => "?").join(",");

    // 3. Archivos de todas las consultas en una sola query
    const files = await db.execute({
      sql: `SELECT fileId, consultationId, fileType, fileUrl
            FROM ClinicalFiles WHERE consultationId IN (${placeholders})`,
      args: consultationIds,
    });

    // 4. Recetas de todas las consultas en una sola query
    const prescriptions = await db.execute({
      sql: `SELECT
              pr.prescriptionId,
              pr.consultationId,
              pr.dosage,
              pr.frequency,
              pr.duration,
              m.brandName AS medicationName,
              m.activeIngredient,
              m.presentation
            FROM Prescriptions pr
            INNER JOIN Medications m ON pr.medicationId = m.medicationId
            WHERE pr.consultationId IN (${placeholders})`,
      args: consultationIds,
    });

    // 5. Agrupar por consultationId con Maps
    const filesByConsultation = new Map<number, typeof files.rows>();
    for (const file of files.rows) {
      const cId = file.consultationId as number;
      if (!filesByConsultation.has(cId)) filesByConsultation.set(cId, []);
      filesByConsultation.get(cId)!.push(file);
    }

    const prescriptionsByConsultation = new Map<number, typeof prescriptions.rows>();
    for (const pr of prescriptions.rows) {
      const cId = pr.consultationId as number;
      if (!prescriptionsByConsultation.has(cId)) prescriptionsByConsultation.set(cId, []);
      prescriptionsByConsultation.get(cId)!.push(pr);
    }

    // 6. Ensamblar respuesta final
    const history = consultations.rows.map((c) => {
      const cId = c.consultationId as number;
      return {
        consultationId: cId,
        consultationDate: c.consultationDate,
        diagnosis: c.diagnosis,
        symptoms: c.symptoms,
        immutable: true,
        appointment: {
          appointmentId: c.appointmentId,
          dateTime: c.appointmentDateTime,
          doctor: {
            doctorId: c.doctorId,
            fullName: c.doctorFullName,
          },
        },
        files: (filesByConsultation.get(cId) ?? []).map((f) => ({
          fileId: f.fileId,
          fileType: f.fileType,
          fileUrl: f.fileUrl,
        })),
        prescriptions: (prescriptionsByConsultation.get(cId) ?? []).map((p) => ({
          prescriptionId: p.prescriptionId,
          medication: p.medicationName,
          activeIngredient: p.activeIngredient,
          presentation: p.presentation,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
        })),
      };
    });

    return ok({ patientId, totalConsultations: history.length, history });

  } catch (err) {
    console.error("[GET /api/patients/:id/history]", err);
    return serverError();
  }
}