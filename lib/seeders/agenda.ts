export type Cita = {
  id: string;
  matricula_doctor: string;
  matricula_paciente: string;
  nombre_paciente: string;
  fecha: string;
  estatus: "pendiente" | "completada" | "cancelada";
};

export const agendaSeed: Cita[] = [
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