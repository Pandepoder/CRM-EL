"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, BarChart3, Calendar, Plus, Settings2, Sparkles } from "lucide-react";

import type { ActividadItem, FiltrosBitacora, PaginaBitacora, ResumenBitacora } from "@/lib/bitacora-tipos";

import { AdministrarOpciones } from "./componentes/AdministrarOpciones";
import { FichaActividad } from "./componentes/FichaActividad";
import { FormularioActividad, type UsuarioOpcion } from "./componentes/FormularioActividad";
import { ListaActividades, type OpcionFiltro } from "./componentes/ListaActividades";
import { Prospectos } from "./componentes/Prospectos";
import { ResumenEquipo } from "./componentes/ResumenEquipo";

type Pestana = "agenda" | "prospectos" | "resumen";

const PESTANAS: ReadonlyArray<{ clave: Pestana; etiqueta: string; href: string; Icono: typeof Calendar }> = [
  { clave: "agenda", etiqueta: "Actividades", href: "/equipo", Icono: Calendar },
  { clave: "prospectos", etiqueta: "Prospectos", href: "/equipo?tab=prospectos", Icono: Sparkles },
  { clave: "resumen", etiqueta: "Resumen", href: "/equipo?tab=resumen", Icono: BarChart3 }
];

/**
 * Armazón de la bitácora: une el listado, el formulario, la ficha, los prospectos, el resumen y la
 * administración de opciones. Cada parte vive en su propio componente; aquí solo se coordina qué
 * está abierto y se refresca el servidor cuando algo cambia.
 */
export default function AgendaClient({
  pestana, pagina, filtros, resumen, usuarios, tipos, etiquetas, contactoNombre, usuarioActualId,
  puedeAsignar, puedeCrear, esAdmin, puedeConvertir
}: {
  pestana: Pestana;
  pagina: PaginaBitacora | null;
  filtros: FiltrosBitacora;
  resumen: ResumenBitacora | null;
  usuarios: UsuarioOpcion[];
  tipos: OpcionFiltro[];
  etiquetas: OpcionFiltro[];
  contactoNombre: string | null;
  usuarioActualId: string;
  puedeAsignar: boolean;
  puedeCrear: boolean;
  esAdmin: boolean;
  puedeConvertir: boolean;
}) {
  const router = useRouter();
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [plantilla, setPlantilla] = useState<ActividadItem | null>(null);
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [administrando, setAdministrando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // El botón flotante del panel llega con ?crear=evento: se abre el alta y el parámetro se retira
  // para que el formulario no reaparezca al recargar.
  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get("crear") !== "evento" || !puedeCrear) return;
    parametros.delete("crear");
    const restante = parametros.toString();
    window.history.replaceState({}, "", window.location.pathname + (restante ? `?${restante}` : ""));
    setFormularioAbierto(true);
  }, [puedeCrear]);

  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(null), 6000);
    return () => clearTimeout(t);
  }, [mensaje]);

  const nueva = () => { setPlantilla(null); setFormularioAbierto(true); };

  return (
    <div className="workspace-page agenda-page p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="workspace-hero flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5 mb-1">
            <Activity size={13} aria-hidden="true" /> Registra · Encuentra · Da seguimiento
          </span>
          <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight">Tu bitácora de campo</h1>
          <p className="text-gray-500 mt-1">Registra lo que haces, encuentra lo guardado y no pierdas el siguiente paso.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {puedeCrear && (
            <button type="button" onClick={() => setAdministrando(true)} className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-sm inline-flex items-center gap-2 cursor-pointer">
              <Settings2 size={15} aria-hidden="true" /> Administrar opciones
            </button>
          )}
          {puedeCrear && (
            <button type="button" onClick={nueva} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md text-sm inline-flex items-center gap-2 cursor-pointer active:scale-95">
              <Plus size={16} aria-hidden="true" /> Nueva actividad
            </button>
          )}
        </div>
      </div>

      <nav aria-label="Secciones de la bitácora" className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {PESTANAS.map(({ clave, etiqueta, href, Icono }) => (
          <Link key={clave} href={href} aria-current={pestana === clave ? "page" : undefined}
            className={`px-4 py-2 rounded-xl font-extrabold text-sm inline-flex items-center gap-2 transition-all ${pestana === clave ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            <Icono size={15} aria-hidden="true" /> {etiqueta}
          </Link>
        ))}
      </nav>

      {!puedeCrear && pestana === "agenda" && (
        <p className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
          Las actividades las registra quien lidera tu equipo. Aquí puedes consultarlas y, si te las asignaron, cerrarlas o darles seguimiento.
        </p>
      )}

      {mensaje && <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-800">{mensaje}</div>}

      {pestana === "agenda" && pagina && (
        <ListaActividades pagina={pagina} filtros={filtros} usuarios={usuarios} tipos={tipos} etiquetas={etiquetas} puedeAsignar={puedeAsignar} contactoNombre={contactoNombre} onAbrir={(a) => setFichaId(a.id)} />
      )}
      {pestana === "prospectos" && <Prospectos esAdmin={esAdmin} puedeConvertir={puedeConvertir} />}
      {pestana === "resumen" && resumen && <ResumenEquipo resumen={resumen} usuarioActualId={usuarioActualId} />}

      <FormularioActividad
        abierto={formularioAbierto && puedeCrear} plantilla={plantilla} usuarios={usuarios} usuarioActualId={usuarioActualId} puedeAsignar={puedeAsignar} esAdmin={esAdmin}
        onCerrar={() => { setFormularioAbierto(false); setPlantilla(null); }}
        onGuardada={(m) => { setMensaje(m); router.refresh(); }}
      />
      {fichaId && (
        <FichaActividad
          id={fichaId} usuarios={usuarios} usuarioActualId={usuarioActualId} esAdmin={esAdmin}
          onCerrar={() => setFichaId(null)} onCambio={() => router.refresh()}
          onDuplicar={(a) => { setFichaId(null); setPlantilla(a); setFormularioAbierto(true); }}
        />
      )}
      {administrando && <AdministrarOpciones esAdmin={esAdmin} usuarioActualId={usuarioActualId} onCerrar={() => setAdministrando(false)} onCambio={() => router.refresh()} />}
    </div>
  );
}
