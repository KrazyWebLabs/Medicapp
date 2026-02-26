"use client";
import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function Appointments() {
  const [showNewAppointment, setShowNewAppointment] = useState(false);

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Mis Citas</h2>
        <button 
          onClick={() => setShowNewAppointment(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} /> Nueva Cita
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          {/* Aquí iría el calendario generado dinámicamente */}
          <p className="text-gray-500">Calendario de disponibilidad...</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-black">
          <h3 className="font-semibold mb-4">Próximas Citas</h3>
          <div className="text-sm text-gray-500 italic">No tienes citas pendientes</div>
        </div>
      </div>

      {showNewAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 text-black">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Agendar Nueva Cita</h3>
            <form className="space-y-4">
              <input type="date" className="w-full border p-2 rounded" required />
              <textarea placeholder="Motivo de la consulta" className="w-full border p-2 rounded" rows={3} required />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowNewAppointment(false)} className="flex-1 border p-2 rounded">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white p-2 rounded">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}