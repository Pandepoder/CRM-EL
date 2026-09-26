import { Package, Inbox, LogOut, Search, Warehouse } from "lucide-react";

import { MarcaMunicipio } from "@/components/MarcaMunicipio";
import { datosDeLogistica, tieneLogistica } from "@/lib/logistica";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { getServerSession } from "@/lib/session-server";

import { AssignModal } from "./AssignModal";
import { CreateItemModal } from "./CreateItemModal";
import { CreateWarehouseModal } from "./CreateWarehouseModal";

/**
 * Logística e inventarios, en los almacenes de tu municipio (etapa 6): el maestro, todos. Ver
 * `lib/logistica.ts` (A4, M32, M33).
 */
export default async function LogisticaPage() {
  const session = await getServerSession();
  const alcance = await resolveUserNetworkScope(session.userId);
  const { almacenes, articulos: items, movimientos: recentTxs, personas } = await datosDeLogistica(alcance);
  const conMunicipio = tieneLogistica(alcance);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" strokeWidth={2.5} />
            Control de Logística
          </h1>
          <p className="text-gray-500 mt-2">Gestión de almacén y distribución de materiales operativos.</p>
        </div>
        {conMunicipio && (
          <div className="flex flex-wrap gap-2 justify-end">
            <CreateWarehouseModal eligeMunicipio={alcance.isMaster} />
            <CreateItemModal almacenes={almacenes.map((a) => ({ id: a.id, nombre: a.municipio ? `${a.nombre} · ${a.municipio}` : a.nombre }))} />
            <AssignModal items={items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity }))} personas={personas} />
          </div>
        )}
      </header>

      {!conMunicipio && (
        <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
          Tu cuenta no tiene municipio, así que no tiene almacenes. El administrador maestro te lo asigna.
        </p>
      )}

      {conMunicipio && (
        <section aria-label="Almacenes" className="flex flex-wrap gap-2">
          {almacenes.length === 0 ? (
            <p className="text-sm text-gray-500">Todavía no hay almacenes. Da de alta el primero con «Nuevo almacén».</p>
          ) : (
            almacenes.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                <Warehouse size={16} className="text-blue-600" />
                <span className="font-bold text-gray-900">{a.nombre}</span>
                <span className="text-xs text-gray-500"><MarcaMunicipio nombre={a.municipio} esGeneral={a.municipioTipo === "general"} /></span>
              </div>
            ))
          )}
        </section>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
              <Package size={24} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Artículos Totales</p>
            <h2 className="text-4xl font-black text-gray-900 mt-1">{totalItems}</h2>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
              <Inbox size={24} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Stock Disponible</p>
            <h2 className="text-4xl font-black text-gray-900 mt-1">{items.length} SKUs</h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="bg-orange-50 text-orange-600 p-3 rounded-xl">
              <LogOut size={24} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Salidas Recientes</p>
            <h2 className="text-4xl font-black text-gray-900 mt-1">{recentTxs.filter(t => t.transactionType === "out").length}</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inventory List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-bold text-gray-900 text-lg">Inventario Actual</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input 
                  type="text" 
                  placeholder="Buscar artículo..." 
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 w-64"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/50 text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">SKU / Nombre</th>
                    <th className="px-6 py-4 font-semibold">Categoría</th>
                    <th className="px-6 py-4 font-semibold text-right">Existencias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                        No hay artículos registrados en el inventario.
                      </td>
                    </tr>
                  ) : (
                    items.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-md object-cover border border-gray-200" />
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                                <Package size={16} />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-500 font-mono mt-0.5">{item.sku}</div>
                              {item.description && <div className="text-xs text-gray-400 mt-1 max-w-xs truncate" title={item.description}>{item.description}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-semibold uppercase tracking-wider">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-gray-900 text-lg">{item.quantity}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Transactions Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50">
              <h2 className="font-bold text-gray-900 text-lg">Historial Reciente</h2>
            </div>
            <div className="p-6 space-y-6">
              {recentTxs.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-4">
                  No hay movimientos recientes.
                </div>
              ) : (
                recentTxs.slice(0, 8).map(tx => (
                  <div key={tx.id} className="flex gap-4">
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.transactionType === "in" ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"}`}>
                      {tx.transactionType === "in" ? <Inbox size={16} /> : <LogOut size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {tx.transactionType === "in" ? "Entrada" : "Asignación"} de Stock
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="font-medium text-gray-700">{tx.quantity} uds.</span> · {tx.articulo}
                        {tx.responsable ? ` · para ${tx.responsable}` : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

