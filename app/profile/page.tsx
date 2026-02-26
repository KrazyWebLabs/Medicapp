'use client';
import { useState } from 'react';
import { User, Pill, FileText, Edit2, Save } from 'lucide-react';

// Simulación de datos (debería venir de mockData)
const mockPatientProfile = {
  name: "Paciente de Prueba",
  matricula: "P001",
  email: "paciente@ejemplo.com",
  phone: "555-0123",
  birthDate: "1990-01-01",
  medications: []
};

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile] = useState(mockPatientProfile);
  const [activeTab, setActiveTab] = useState<'personal' | 'history' | 'allergies' | 'medications'>('personal');

  const tabs = [
    { id: 'personal', label: 'Datos Personales', icon: User },
    { id: 'history', label: 'Historial Médico', icon: FileText },
    { id: 'medications', label: 'Medicamentos', icon: Pill },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6 text-black">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {profile.name[0]}
          </div>
          <div>
            <h2 className="text-2xl font-semibold">{profile.name}</h2>
            <p className="text-gray-600">Matrícula: {profile.matricula}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          {isEditing ? <Save size={18} /> : <Edit2 size={18} />}
          {isEditing ? 'Guardar' : 'Editar'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 flex items-center gap-2 ${activeTab === tab.id ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600'}`}
            >
              <tab.icon size={20} /> {tab.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'personal' && (
            <div className="grid grid-cols-2 gap-4">
              <input disabled={!isEditing} value={profile.email} className="border p-2 rounded" />
              <input disabled={!isEditing} value={profile.phone} className="border p-2 rounded" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}