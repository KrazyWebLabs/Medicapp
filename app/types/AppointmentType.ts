import { AcceptedDocuments } from "./AcceptedDocumentsType";

export type AppointmentStatus = "pendiente" | "completada" | "cancelada";

export type Appointment = {
  id: string;
  matricula_paciente: string;
  matricula_doctor: string;
  nombre_paciente: string;
  fecha: string;
  estatus: AppointmentStatus;
  diagnostico?: string;
  tratamiento?: string;
  medico_responsable?: string;
  documents?: AcceptedDocuments[];
};