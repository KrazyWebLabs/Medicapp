import { Calendar, Bell, FileText } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { label: 'Citas Pendientes', value: '2', icon: Calendar, color: 'bg-blue-500' },
    { label: 'Notificaciones', value: '5', icon: Bell, color: 'bg-yellow-500' },
    { label: 'Consultas Realizadas', value: '12', icon: FileText, color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="bg-linear-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold">¡Hola, Paciente!</h2>
        <p className="opacity-90">Aquí puedes gestionar tus citas y revisar tu historial médico.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-black flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
            <div className={`${stat.color} p-3 rounded-lg text-white`}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}

        <a
          href="/profile"
          className="inline-block px-4 py-2 mr-4 text-white duration-150 font-medium bg-purple-500 rounded-lg hover:bg-purple-600 active:bg-purple-800 md:text-sm capitalize max-w-fit"
        >
          <p className="text-lg">Profile</p>
        </a>
        <a
          href="/appointments"
          className="inline-block px-4 py-2 mr-4 text-white duration-150 max-w-fit font-medium bg-blue-500 rounded-lg hover:bg-blue-600 active:bg-blue-800 md:text-sm capitalize"
        >
          <p className="text-lg">Appointments</p>
        </a>
      </div>
    </div>
  );
}