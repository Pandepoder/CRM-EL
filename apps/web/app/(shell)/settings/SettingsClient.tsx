"use client";

import { useState } from "react";
// @ts-ignore
import { Settings, Bell, Shield, Smartphone, Globe, Lock, Mail, Eye, Key } from "lucide-react";

export default function SettingsClient() {
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "General", icon: <Settings size={18} /> },
    { id: "notificaciones", label: "Notificaciones", icon: <Bell size={18} /> },
    { id: "privacidad", label: "Privacidad", icon: <Shield size={18} /> },
    { id: "dispositivos", label: "Seguridad y Dispositivos", icon: <Smartphone size={18} /> },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-10">
      <div className="mb-8 border-b border-gray-200/60 pb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-blue-950 tracking-tight">Ajustes del Sistema</h1>
          <p className="text-gray-500 mt-2 text-sm md:text-base font-medium">Configura las preferencias globales de tu cuenta y la plataforma operativa.</p>
        </div>
        <div className="hidden md:flex h-16 w-16 bg-blue-50 text-blue-600 rounded-full items-center justify-center shadow-inner">
          <Settings size={32} strokeWidth={1.5} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar Nav */}
        <div className="lg:w-72 flex-shrink-0 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 font-bold rounded-2xl transition-all duration-200 group ${
                activeTab === tab.id
                  ? "bg-white text-blue-700 shadow-sm ring-1 ring-gray-900/5 transform scale-[1.02]"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div className={`p-2 rounded-xl transition-colors ${activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                {tab.icon}
              </div>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {activeTab === "general" && (
            <div className="bg-white rounded-3xl p-8 shadow-sm ring-1 ring-gray-900/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Globe size={20} /></div>
                Idioma y Región
              </h2>
              
              <div className="space-y-6">
                <div className="group">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Idioma de la Interfaz</label>
                  <select className="w-full p-4 bg-gray-50 hover:bg-gray-100/50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-800 cursor-pointer transition-all appearance-none font-medium">
                    <option>Español (México)</option>
                    <option>English (US)</option>
                  </select>
                </div>
                <div className="group">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Zona Horaria</label>
                  <select className="w-full p-4 bg-gray-50 hover:bg-gray-100/50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-800 cursor-pointer transition-all appearance-none font-medium">
                    <option>America/Mexico_City (GMT-6)</option>
                    <option>America/Tijuana (GMT-8)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notificaciones" && (
            <div className="bg-white rounded-3xl p-8 shadow-sm ring-1 ring-gray-900/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Bell size={20} /></div>
                Preferencias de Notificación
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-5 bg-white hover:bg-gray-50/50 rounded-2xl border border-gray-100 shadow-sm transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <Mail size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Alertas por Correo Electrónico</h3>
                      <p className="text-sm text-gray-500 font-medium">Recibir resúmenes diarios y alertas críticas.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "privacidad" && (
            <div className="bg-white rounded-3xl p-8 shadow-sm ring-1 ring-gray-900/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Eye size={20} /></div>
                Privacidad del Perfil
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-5 bg-white hover:bg-gray-50/50 rounded-2xl border border-gray-100 shadow-sm transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <Shield size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Visibilidad en el Directorio</h3>
                      <p className="text-sm text-gray-500 font-medium">Permitir que otros miembros te encuentren.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "dispositivos" && (
            <div className="bg-white rounded-3xl p-8 shadow-sm ring-1 ring-gray-900/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Lock size={20} /></div>
                Seguridad
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-5 bg-white hover:bg-gray-50/50 rounded-2xl border border-gray-100 shadow-sm transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                      <Key size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Autenticación de Dos Pasos (2FA)</h3>
                      <p className="text-sm text-gray-500 font-medium">Añade una capa extra de seguridad.</p>
                    </div>
                  </div>
                  <button className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors">
                    Activar
                  </button>
                </div>

                <div className="flex items-center justify-between p-5 bg-white hover:bg-gray-50/50 rounded-2xl border border-gray-100 shadow-sm transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                      <Smartphone size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Sesiones Activas</h3>
                      <p className="text-sm text-gray-500 font-medium">Cierra la sesión en otros dispositivos.</p>
                    </div>
                  </div>
                  <button className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors">
                    Revisar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-6">
            <button className="px-8 py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl shadow-lg shadow-gray-900/20 transition-all transform hover:-translate-y-0.5">
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
