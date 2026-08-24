"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Users, Building2, Briefcase, Activity } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

export default function AnalyticsClient({ 
  totalCitizens, 
  availabilityData, 
  skillData, 
  topColonies 
}: { 
  totalCitizens: number, 
  availabilityData: any[], 
  skillData: any[], 
  topColonies: any[] 
}) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight">Análisis Demográfico</h1>
        <p className="text-gray-500 mt-1">MéMétricas en tiempo real de la estructura y padrón.</p>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase">Padrón Total</p>
            <p className="text-3xl font-bold text-gray-900">{totalCitizens}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Building2 size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase">Colonias Cubiertas</p>
            <p className="text-3xl font-bold text-gray-900">{topColonies.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Briefcase size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase">Perfiles Tácticos</p>
            <p className="text-3xl font-bold text-gray-900">{skillData.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Activity size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase">Voluntarios Activos</p>
            <p className="text-3xl font-bold text-gray-900">
              {availabilityData.find(d => d.name === "Voluntario activo")?.value || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nivel de Disponibilidad (Pie Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-50 pb-2">Distribución de Disponibilidad</h2>
          {availabilityData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400">Sin datos registrados</div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={availabilityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {availabilityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] ?? "#6366f1"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} ciudadanos`, "Total"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Habilidades Tácticas (Bar Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-50 pb-2">Top Perfiles Tácticos</h2>
          {skillData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400">Sin datos registrados</div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value} ciudadanos`, "Total"]} cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24}>
                    {skillData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length] ?? "#8b5cf6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top Colonias */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-50 pb-2">Mayor Presencia Territorial (Top Colonias)</h2>
        {topColonies.length === 0 ? (
          <div className="text-gray-400 py-8 text-center">Sin datos territoriales</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topColonies.map((colony, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <span className="font-semibold text-gray-800">{colony.name}</span>
                </div>
                <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-gray-600 shadow-sm">
                  {colony.value} pax
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
