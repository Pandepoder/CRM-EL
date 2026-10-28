import { Package, Warehouse } from "lucide-react";

import { MarcaMunicipio } from "@/components/MarcaMunicipio";
import { datosDeLogistica, puedeArchivar, tieneLogistica } from "@/lib/logistica";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { getServerSession } from "@/lib/session-server";

import { CreateItemModal } from "./CreateItemModal";
import { CreateWarehouseModal } from "./CreateWarehouseModal";
import { InventarioClient } from "./InventarioClient";

export const dynamic = "force-dynamic";

/**
 * Logística e inventarios, en los almacenes de tu municipio (etapa 6): el maestro, todos. Ver
 * `lib/logistica.ts` (A4, M32, M33) y el plan de auditoría de menús, fase 5: buscador que sí busca, «Por
 * agotarse» (D7), editar y archivar, quién tiene qué con devoluciones, historial completo, y los nombres de otras
 * estructuras sumados sin nombre (P1). La guarda de acceso está en `layout.tsx`.
 */
export default async function LogisticaPage() {
  const session = await getServerSession();
  const alcance = await resolveUserNetworkScope(session.userId);
  const conMunicipio = tieneLogistica(alcance);
  const datos = await datosDeLogistica(alcance);

  return (
    <div className="max-w-6xl mx-auto px-4 pt-3 pb-6 md:p-6 space-y-4">
      <header className="space-y-3">
        <div>
          <h1 className="hidden md:flex text-3xl font-black text-slate-900 tracking-tight items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" aria-hidden="true" /> Logística e Inventarios
          </h1>
          <p className="text-sm text-gray-600">Material y almacén: lo que hay, lo que sale y a quién se entrega.</p>
        </div>
        {conMunicipio && (
          <div className="flex flex-wrap gap-2">
            <CreateItemModal almacenes={datos.almacenes.map((a) => ({ id: a.id, nombre: a.municipio ? `${a.nombre} · ${a.municipio}` : a.nombre }))} />
            <CreateWarehouseModal eligeMunicipio={alcance.isMaster} />
          </div>
        )}
      </header>

      {!conMunicipio ? (
        <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
          Tu cuenta no tiene municipio, así que no tiene almacenes. El administrador maestro te lo asigna.
        </p>
      ) : datos.almacenes.length === 0 ? (
        <p className="text-sm text-gray-600">Todavía no hay almacenes. Da de alta el primero con «Nuevo almacén».</p>
      ) : (
        <>
          <section aria-label="Almacenes" className="flex flex-wrap gap-2">
            {datos.almacenes.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                <Warehouse size={16} className="text-blue-600" aria-hidden="true" />
                <span className="font-bold text-gray-900">{a.nombre}</span>
                <span className="text-xs text-gray-500"><MarcaMunicipio nombre={a.municipio} esGeneral={a.municipioTipo === "general"} /></span>
              </div>
            ))}
          </section>
          <InventarioClient
            articulos={datos.articulos}
            almacenes={datos.almacenes.map((a) => ({ id: a.id, nombre: a.nombre }))}
            resumen={datos.resumen}
            enManos={datos.enManos}
            movimientosIniciales={datos.movimientos}
            personas={datos.personas}
            puedeArchivar={puedeArchivar(alcance)}
          />
        </>
      )}
    </div>
  );
}
