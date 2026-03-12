import { Appointment } from "@/Types/AppointmentType";

export const agendaSeed: Appointment[] = [
  {
    id: "a-001",
    matricula_doctor: "DOC-001",
    matricula_paciente: "PAC-001",
    nombre_paciente: "Juan García",
    fecha: "2026-03-09",
    estatus: "pendiente",
  },
  {
    id: "a-002",
    matricula_doctor: "DOC-001",
    matricula_paciente: "PAC-002",
    nombre_paciente: "María López",
    fecha: "2026-03-09",
    estatus: "completada",
    diagnostico: "Hipertensión leve",
    tratamiento: "Dieta baja en sodio y ejercicio moderado",
    medico_responsable: "DOC-001",
  },
  {
    id: "a-003",
    matricula_doctor: "DOC-001",
    matricula_paciente: "PAC-003",
    nombre_paciente: "Carlos Ruiz",
    fecha: "2026-03-09",
    estatus: "cancelada",
  },
  {
    id: "a-004",
    matricula_doctor: "DOC-002",
    matricula_paciente: "PAC-004",
    nombre_paciente: "Ana Torres",
    fecha: "2026-03-09",
    estatus: "pendiente",
  },
];