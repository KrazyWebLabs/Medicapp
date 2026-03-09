export type Consulta = {
  id: string;
  matricula_paciente: string;
  fecha: string;
  diagnostico: string;
  tratamiento: string;
  medico_responsable: string;
};

export const historialSeed: Consulta[] = [
  {
    id: "c-001",
    matricula_paciente: "PAC-001",
    fecha: "2025-01-15",
    diagnostico: "Hipertensión arterial leve",
    tratamiento: "Losartán 50mg cada 24 horas",
    medico_responsable: "Dr. Carlos Méndez",
  },
  {
    id: "c-002",
    matricula_paciente: "PAC-001",
    fecha: "2025-03-02",
    diagnostico: "Infección respiratoria aguda",
    tratamiento: "Amoxicilina 500mg cada 8 horas por 7 días",
    medico_responsable: "Dra. Laura Ríos",
  },
  {
    id: "c-003",
    matricula_paciente: "PAC-001",
    fecha: "2025-06-20",
    diagnostico: "Gastritis crónica",
    tratamiento: "Omeprazol 20mg en ayunas por 30 días",
    medico_responsable: "Dr. Carlos Méndez",
  },
  {
    id: "c-004",
    matricula_paciente: "PAC-002",
    fecha: "2025-02-10",
    diagnostico: "Diabetes tipo 2",
    tratamiento: "Metformina 850mg con cada comida",
    medico_responsable: "Dra. Laura Ríos",
  },
  {
    id: "c-005",
    matricula_paciente: "PAC-002",
    fecha: "2025-04-18",
    diagnostico: "Control glucémico",
    tratamiento: "Ajuste de dosis: Metformina 1000mg",
    medico_responsable: "Dra. Laura Ríos",
  },
  {
    id: "c-006",
    matricula_paciente: "PAC-002",
    fecha: "2025-07-05",
    diagnostico: "Neuropatía diabética leve",
    tratamiento: "Vitamina B12 + control mensual",
    medico_responsable: "Dr. Carlos Méndez",
  },
];