"use client";

import { useState } from "react";
import { Copy, Check, X, MessageSquare } from "lucide-react";

export function PersonalLinkModal({
  isOpen,
  onClose,
  userName,
  slug
}: {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  slug: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const fullUrl = `${origin}/registro/${slug}`;
  const whatsappMessage = encodeURIComponent(
    `¡Hola! Te invito a sumarte a nuestro proyecto social por Tonalá. Puedes registrarte de manera muy sencilla aquí: ${fullUrl}`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

  // QR Code URL via public SVG API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(fullUrl)}&color=0f172a&bgcolor=ffffff`;

  function handleCopy() {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 flex justify-between items-center relative overflow-hidden shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded-full text-blue-200 border border-white/15">
              Enlace Personal & QR
            </span>
            <h3 className="text-lg sm:text-xl font-black mt-1 text-white">Tu Enlace de Registro</h3>
            <p className="text-xs text-blue-200 mt-0.5">{userName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 text-center overflow-y-auto overscroll-contain flex-1 pb-16">
          {/* QR Code */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 inline-block shadow-inner">
            <img
              src={qrCodeUrl}
              alt={`Código QR de ${userName}`}
              className="w-48 h-48 mx-auto rounded-xl shadow-sm"
            />
            <p className="text-[10px] text-gray-500 font-bold mt-2">Escanea con tu celular o WhatsApp</p>
          </div>

          {/* URL Input with Copy */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">
              URL Personal para Compartir
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={fullUrl}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  copied
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? "Copiado" : "Copiar"}</span>
              </button>
            </div>
          </div>

          {/* Quick Share to WhatsApp */}
          <div className="pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageSquare size={16} />
              <span>Compartir por WhatsApp Directo</span>
            </a>
          </div>

          <p className="text-[10px] text-gray-400 font-medium">
            💡 Cuando alguien se registre con este enlace o código QR, quedará sumado automáticamente a tu red y equipo.
          </p>
        </div>
      </div>
    </div>
  );
}
