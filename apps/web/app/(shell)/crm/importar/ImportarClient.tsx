"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Loader2, MapPin, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { avisar } from "@/lib/avisos";
import { nuevaClave } from "@/lib/cola-de-envios";
import {
  ETIQUETA_DE_CAMPO,
  ESPERA_ENTRE_BUSQUEDAS_MS,
  RENGLONES_POR_TANDA,
  TOPE_DE_BYTES,
  UBICACIONES_POR_ENVIO,
  leerRenglones,
  nombreDelRenglon,
  type CampoImportable,
  type RenglonDelArchivo
} from "@/lib/importar-ciudadanos";
import type { RenglonGuardado, RenglonRevisado, Resumen } from "@/lib/importar-ciudadanos-servicio";
import { MUNICIPIOS_JALISCO } from "@/lib/municipios-jalisco";

type Persona = { id: string; nombre: string; nivel: string; municipio: string | null };

type Archivo = { nombre: string; renglones: RenglonDelArchivo[]; reconocidas: CampoImportable[]; ignoradas: string[] };

type Vista = "problemas" | "listos" | "todos";

const MOSTRAR_A_LA_VEZ = 200;

const plural = (n: number, uno: string, varios: string) => `${n.toLocaleString("es-MX")} ${n === 1 ? uno : varios}`;

async function enviar<T>(url: string, cuerpo: unknown): Promise<{ ok: true; datos: T } | { ok: false; mensaje: string; sinConexion?: boolean }> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    const datos = (await r.json().catch(() => ({}))) as T & { message?: string };
    if (!r.ok) return { ok: false, mensaje: datos.message ?? "Algo salió mal. Intenta de nuevo." };
    return { ok: true, datos };
  } catch {
    return { ok: false, mensaje: "Se cortó la conexión.", sinConexion: true };
  }
}

/**
 * Importar desde Excel (`/crm/importar`). El archivo se lee aquí, en el navegador; al servidor solo viajan los
 * renglones, en el cuerpo. Primero la vista previa (nada se guarda), después el guardado en tandas y, a quien
 * no trae su punto (solo domicilio, o sección), la búsqueda de su domicilio en el mapa.
 */
export default function ImportarClient({
  municipioPropio,
  personas,
  pendientes
}: {
  /** El municipio que administra; `null` para el maestro. */
  municipioPropio: string | null;
  personas: Persona[];
  /** Ciudadanos que importó antes, sin su punto en el mapa y cuyo domicilio no se ha buscado. */
  pendientes: string[];
}) {
  const [municipio, setMunicipio] = useState(municipioPropio ?? "");
  const [responsableId, setResponsableId] = useState("");
  const [archivo, setArchivo] = useState<Archivo | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState<{ renglones: RenglonRevisado[]; resumen: Resumen } | null>(null);
  const [vista, setVista] = useState<Vista>("problemas");
  const [guardado, setGuardado] = useState<{ hechos: number; total: number; renglones: RenglonGuardado[]; terminado: boolean } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [porUbicar, setPorUbicar] = useState<string[]>(pendientes);
  const [ubicando, setUbicando] = useState(false);
  const [ubicados, setUbicados] = useState({ punto: 0, seccion: 0, sinPunto: 0, noEncontrados: 0 });
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);
  const detener = useRef(false);
  const entrada = useRef<HTMLInputElement>(null);
  // Una clave por importación (agrupa sus tandas en la auditoría) y una por renglón (reenviar no duplica).
  const importacionId = useRef<string>(nuevaClave());
  const claves = useRef(new Map<number, string>());

  const deEsteMunicipio = useMemo(
    () => personas.filter((p) => !municipio || !p.municipio || p.municipio === municipio),
    [personas, municipio]
  );
  const porRenglon = useMemo(() => new Map((archivo?.renglones ?? []).map((r) => [r.renglon, r])), [archivo]);
  const listos = revision?.renglones.filter((r) => r.estado === "listo") ?? [];

  function empezarDeNuevo() {
    setArchivo(null);
    setRevision(null);
    setGuardado(null);
    setError(null);
    importacionId.current = nuevaClave();
    claves.current = new Map();
    if (entrada.current) entrada.current.value = "";
  }

  async function revisar(a: Archivo, opciones = { municipio, responsableId }) {
    setRevision(null);
    setError(null);
    setLeyendo(true);
    const r = await enviar<{ renglones: RenglonRevisado[]; resumen: Resumen }>("/api/crm/contacts/importar/revision", {
      municipio: opciones.municipio || null,
      responsableId: opciones.responsableId || null,
      renglones: a.renglones
    });
    setLeyendo(false);
    if (!r.ok) {
      setError(r.mensaje);
      return;
    }
    setRevision(r.datos);
    setVista(r.datos.resumen.repetidos + r.datos.resumen.errores > 0 ? "problemas" : "listos");
  }

  async function elegirArchivo(lista: FileList | null) {
    const elegido = lista?.[0];
    if (!elegido) return;
    empezarDeNuevo();
    if (!/\.xlsx$/i.test(elegido.name)) {
      setError("El archivo tiene que ser de Excel (.xlsx). Si es .xls o .csv, ábrelo en Excel y guárdalo como «Libro de Excel (.xlsx)».");
      return;
    }
    if (elegido.size > TOPE_DE_BYTES) {
      setError("El archivo pesa más de 5 MB. Divídelo en varios archivos.");
      return;
    }
    setLeyendo(true);
    try {
      // Solo se carga al elegir un archivo: quien abre la pantalla no descarga el lector de Excel.
      const { readSheet } = await import("read-excel-file/browser");
      // Los números como vienen escritos: un teléfono no se convierte en 3.31E+09.
      const hoja = await readSheet(elegido, { parseNumber: (texto: string) => texto });
      const lectura = leerRenglones(hoja);
      if (!lectura.ok) {
        setLeyendo(false);
        setError(lectura.error);
        return;
      }
      const a = { nombre: elegido.name, renglones: lectura.renglones, reconocidas: lectura.reconocidas, ignoradas: lectura.ignoradas };
      setArchivo(a);
      await revisar(a);
    } catch {
      setLeyendo(false);
      setError("No pudimos leer el archivo. Revisa que sea un Excel (.xlsx) y que no tenga contraseña.");
    }
  }

  function cambiarMunicipio(nuevo: string) {
    setMunicipio(nuevo);
    // Lo revisado dependía del municipio (el de quienes no lo dicen): se vuelve a revisar.
    if (archivo && !guardado) void revisar(archivo, { municipio: nuevo, responsableId });
  }

  async function guardar() {
    if (!revision || !archivo) return;
    const aGuardar = listos.map((l) => porRenglon.get(l.renglon)).filter((r): r is RenglonDelArchivo => Boolean(r));
    for (const r of aGuardar) if (!claves.current.has(r.renglon)) claves.current.set(r.renglon, nuevaClave());
    setGuardando(true);
    let estado = guardado ?? { hechos: 0, total: aGuardar.length, renglones: [] as RenglonGuardado[], terminado: false };
    setGuardado(estado);
    for (let i = estado.hechos; i < aGuardar.length; i += RENGLONES_POR_TANDA) {
      const tanda = aGuardar.slice(i, i + RENGLONES_POR_TANDA);
      const r = await enviar<{ renglones: RenglonGuardado[] }>("/api/crm/contacts/importar", {
        importacionId: importacionId.current,
        municipio: municipio || null,
        responsableId: responsableId || null,
        renglones: tanda.map((t) => ({ ...t, clientRequestId: claves.current.get(t.renglon) }))
      });
      if (!r.ok) {
        setGuardando(false);
        avisar(
          r.sinConexion
            ? `Se cortó la conexión después de guardar ${plural(estado.hechos, "persona", "personas")}. Toca «Seguir guardando»: nadie se duplica.`
            : r.mensaje
        );
        return;
      }
      estado = { ...estado, hechos: i + tanda.length, renglones: [...estado.renglones, ...r.datos.renglones] };
      setGuardado(estado);
      const nuevos = r.datos.renglones.flatMap((g) => (g.estado === "guardado" && g.porUbicar ? [g.contactId] : []));
      if (nuevos.length > 0) setPorUbicar((antes) => [...new Set([...antes, ...nuevos])]);
    }
    estado = { ...estado, terminado: true };
    setGuardado(estado);
    setGuardando(false);
    const cuantos = estado.renglones.filter((g) => g.estado === "guardado").length;
    avisar(`Se guardaron ${plural(cuantos, "persona", "personas")}.`, "exito", { accion: { etiqueta: "Ver en el Directorio", href: "/crm/contacts" } });
  }

  async function ubicar() {
    detener.current = false;
    setUbicando(true);
    setAvisoUbicacion(null);
    let restantes = porUbicar;
    while (restantes.length > 0 && !detener.current) {
      const ids = restantes.slice(0, UBICACIONES_POR_ENVIO);
      const r = await enviar<{ resultados: { id: string; resultado: string }[]; detenido: "ocupado" | "saturado" | "limite" | null }>(
        "/api/crm/contacts/importar/ubicar",
        { ids }
      );
      if (!r.ok) {
        setAvisoUbicacion(r.sinConexion ? "Se cortó la conexión. Toca «Ubicar por domicilio» para seguir." : r.mensaje);
        break;
      }
      const hechos = new Set(r.datos.resultados.map((x) => x.id));
      const cuenta = (tipo: string) => r.datos.resultados.filter((x) => x.resultado === tipo).length;
      setUbicados((u) => ({
        punto: u.punto + cuenta("punto"),
        seccion: u.seccion + cuenta("seccion"),
        sinPunto: u.sinPunto + cuenta("sin_punto"),
        noEncontrados: u.noEncontrados + cuenta("no_encontrado")
      }));
      restantes = restantes.filter((id) => !hechos.has(id));
      setPorUbicar(restantes);
      if (r.datos.detenido) {
        setAvisoUbicacion(
          r.datos.detenido === "ocupado"
            ? "Otra importación está buscando domicilios en este momento. Intenta en unos minutos."
            : r.datos.detenido === "limite"
              ? "Llegaste al máximo de búsquedas por hora. Sigue más tarde: lo que falta queda guardado."
              : "El buscador de domicilios está ocupado. Intenta más tarde: lo que falta queda guardado."
        );
        break;
      }
    }
    setUbicando(false);
  }

  const minutos = Math.max(1, Math.ceil((porUbicar.length * ESPERA_ENTRE_BUSQUEDAS_MS) / 60_000));
  const totalUbicados = ubicados.punto + ubicados.seccion + ubicados.sinPunto + ubicados.noEncontrados;
  // Solo lo que pasó: «3 quedaron en su domicilio · 1 no se encontró».
  const resultadosDeLaBusqueda = [
    [ubicados.punto, "quedó en su domicilio", "quedaron en su domicilio"],
    [ubicados.seccion, "quedó en su sección", "quedaron en su sección"],
    [ubicados.sinPunto, "sigue en el centro de su sección", "siguen en el centro de su sección"],
    [ubicados.noEncontrados, "no se encontró", "no se encontraron"]
  ] as const;
  const filas = (revision?.renglones ?? []).filter((r) =>
    vista === "todos" ? true : vista === "listos" ? r.estado === "listo" : r.estado !== "listo"
  );
  const noGuardados = guardado?.renglones.filter((g) => g.estado !== "guardado") ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:p-8 space-y-5">
      <div>
        <Link href="/crm/contacts" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Directorio
        </Link>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Importar desde Excel</h1>
        <p className="text-sm text-slate-600 mt-1">
          Sube una lista de personas y quedan en el Directorio y en el mapa. Primero te enseñamos qué pasará con cada renglón: nada se guarda hasta que lo confirmes.
        </p>
      </div>

      {/* 1. De dónde son y quién los atiende */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 space-y-4">
        <h2 className="font-black text-slate-900">1. ¿De dónde son?</h2>
        {municipioPropio ? (
          <p className="text-sm text-slate-700">
            Municipio: <strong>{municipioPropio}</strong>. Solo puedes importar personas de tu municipio.
          </p>
        ) : (
          <label className="block text-sm font-bold text-slate-700">
            Municipio de quienes no lo digan en su renglón
            <select
              value={municipio}
              disabled={guardando || Boolean(guardado)}
              onChange={(e) => cambiarMunicipio(e.target.value)}
              className="mt-1 block w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium"
            >
              <option value="">Que lo diga cada renglón</option>
              {MUNICIPIOS_JALISCO.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm font-bold text-slate-700">
          ¿Quién los atiende? <span className="font-medium text-slate-500">(opcional)</span>
          <select
            value={responsableId}
            disabled={guardando || Boolean(guardado)}
            onChange={(e) => setResponsableId(e.target.value)}
            className="mt-1 block w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium"
          >
            <option value="">Yo</option>
            {deEsteMunicipio.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} · {p.nivel}
                {!municipioPropio && p.municipio ? ` · ${p.municipio}` : ""}
              </option>
            ))}
          </select>
          <span className="block mt-1 text-xs font-medium text-slate-500">Esa persona y quienes coordinan su equipo los verán en su Directorio.</span>
        </label>
      </section>

      {/* 2. El archivo */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3">
        <h2 className="font-black text-slate-900">2. Elige el archivo</h2>
        <p className="text-sm text-slate-700">
          Cada renglón necesita <strong>nombre</strong>, <strong>teléfono</strong> (10 dígitos) y <strong>calle</strong>. También se usan apellidos,
          número, colonia, municipio, sección, correo, fecha de nacimiento, latitud y longitud, y una nota.
        </p>
        <p className="text-sm text-slate-700">
          Con <strong>latitud y longitud</strong> quedan en su punto. A los demás les buscamos después su domicilio en el mapa; mientras tanto, quien
          trae <strong>sección</strong> se ve en el centro de su sección.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <label
            className={`min-h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white text-sm font-extrabold shadow-md ${
              leyendo || guardando ? "opacity-60 pointer-events-none" : "hover:bg-blue-700 cursor-pointer"
            }`}
          >
            <Upload size={16} /> {archivo ? "Elegir otro archivo" : "Elegir archivo .xlsx"}
            <input
              ref={entrada}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              disabled={leyendo || guardando}
              onChange={(e) => void elegirArchivo(e.target.files)}
            />
          </label>
          <a
            href="/plantilla-ciudadanos.xlsx"
            download
            className="min-h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <Download size={16} /> Descargar plantilla
          </a>
        </div>
        {leyendo && (
          <p className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Loader2 size={16} className="animate-spin" /> Revisando el archivo…
          </p>
        )}
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm font-medium text-red-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}
        {archivo && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 space-y-1">
            <p className="flex items-center gap-2 font-bold text-slate-900 break-all">
              <FileSpreadsheet size={16} className="shrink-0 text-emerald-600" /> {archivo.nombre}: {plural(archivo.renglones.length, "persona", "personas")}
            </p>
            <p>Columnas que usamos: {archivo.reconocidas.map((c) => ETIQUETA_DE_CAMPO[c]).join(", ")}.</p>
            {archivo.ignoradas.length > 0 && (
              <p className="text-slate-500">No usamos: {archivo.ignoradas.map((c) => `«${c}»`).join(", ")}.</p>
            )}
          </div>
        )}
      </section>

      {/* 3. La vista previa */}
      {revision && (
        <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 space-y-4">
          <h2 className="font-black text-slate-900">3. Revisa antes de guardar</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <Cifra valor={revision.resumen.listos} texto="listos para guardar" color="text-emerald-700 bg-emerald-50 border-emerald-200" />
            <Cifra valor={revision.resumen.repetidos} texto="repetidos" color="text-amber-800 bg-amber-50 border-amber-200" />
            <Cifra valor={revision.resumen.errores} texto="con error" color="text-red-700 bg-red-50 border-red-200" />
            <Cifra valor={revision.resumen.porUbicar} texto="se buscarán por domicilio" color="text-blue-700 bg-blue-50 border-blue-200" />
          </div>

          <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Qué renglones ver">
            {(
              [
                ["problemas", `Con problemas (${(revision.resumen.repetidos + revision.resumen.errores).toLocaleString("es-MX")})`],
                ["listos", `Listos (${revision.resumen.listos.toLocaleString("es-MX")})`],
                ["todos", "Todos"]
              ] as const
            ).map(([clave, texto]) => (
              <button
                key={clave}
                type="button"
                onClick={() => setVista(clave)}
                aria-pressed={vista === clave}
                className={`min-h-11 px-3 rounded-xl text-xs font-bold border ${
                  vista === clave ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {texto}
              </button>
            ))}
          </div>

          {filas.length === 0 ? (
            <p className="text-sm text-slate-500">{vista === "problemas" ? "Ningún renglón tiene problemas." : "No hay renglones aquí."}</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {filas.slice(0, MOSTRAR_A_LA_VEZ).map((r) => (
                <RenglonDeLaLista key={r.renglon} revisado={r} nombre={nombreDelRenglon(porRenglon.get(r.renglon)?.datos ?? {}).displayName} />
              ))}
            </ul>
          )}
          {filas.length > MOSTRAR_A_LA_VEZ && (
            <p className="text-xs text-slate-500">
              Se ven los primeros {MOSTRAR_A_LA_VEZ}; faltan {(filas.length - MOSTRAR_A_LA_VEZ).toLocaleString("es-MX")}.
            </p>
          )}

          {!guardado?.terminado && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void guardar()}
                disabled={guardando || leyendo || listos.length === 0}
                className="w-full sm:w-auto min-h-11 px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-extrabold shadow-md"
              >
                {guardando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {guardando
                  ? `Guardando ${guardado?.hechos ?? 0} de ${guardado?.total ?? listos.length}…`
                  : guardado
                    ? "Seguir guardando"
                    : `Guardar ${plural(listos.length, "persona", "personas")}`}
              </button>
              <p className="text-xs text-slate-500">
                Los repetidos y los que tienen error no se guardan. Corrígelos en el Excel y vuelve a subirlo: los que ya se guardaron saldrán como repetidos.
              </p>
            </div>
          )}
        </section>
      )}

      {guardado?.terminado && (
        <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 md:p-5 space-y-3">
          <h2 className="flex items-center gap-2 font-black text-emerald-900">
            <CheckCircle2 size={18} /> Se guardaron {plural(guardado.renglones.filter((g) => g.estado === "guardado").length, "persona", "personas")}
          </h2>
          {noGuardados.length > 0 && (
            <div className="text-sm text-slate-700">
              <p className="font-bold">No se guardaron {plural(noGuardados.length, "renglón", "renglones")} (alguien los registró mientras tanto, o cambió algo):</p>
              <ul className="list-disc pl-5">
                {noGuardados.slice(0, 50).map((g) => (
                  <li key={g.renglon}>
                    Renglón {g.renglon}: {g.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Link href="/crm/contacts" className="min-h-11 px-4 inline-flex items-center justify-center rounded-xl bg-white border border-emerald-300 text-sm font-bold text-emerald-900">
              Ver en el Directorio
            </Link>
            <Link href="/mapa" className="min-h-11 px-4 inline-flex items-center justify-center rounded-xl bg-white border border-emerald-300 text-sm font-bold text-emerald-900">
              Ver en el mapa
            </Link>
            <button
              type="button"
              onClick={empezarDeNuevo}
              className="min-h-11 px-4 inline-flex items-center justify-center rounded-xl bg-white border border-emerald-300 text-sm font-bold text-emerald-900"
            >
              Importar otro archivo
            </button>
          </div>
        </section>
      )}

      {/* 4. Ubicar por domicilio */}
      {(porUbicar.length > 0 || totalUbicados > 0) && !guardando && (
        <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3">
          <h2 className="flex items-center gap-2 font-black text-slate-900">
            <MapPin size={18} className="text-blue-600" /> Ubicar por domicilio
          </h2>
          {porUbicar.length > 0 ? (
            <p className="text-sm text-slate-700">
              {plural(porUbicar.length, "persona importada aún no tiene", "personas importadas aún no tienen")} su punto en el mapa. Buscamos su
              domicilio, una cada segundo y medio ({minutos === 1 ? "cerca de un minuto" : `unos ${minutos.toLocaleString("es-MX")} minutos`}). Deja esta
              pantalla abierta mientras tanto. Si no encontramos su casa, quien trae sección se queda en el centro de su sección.
            </p>
          ) : (
            <p className="text-sm text-slate-700">Ya no queda nadie por buscar.</p>
          )}
          {totalUbicados > 0 && (
            <p className="text-sm text-slate-700">
              {resultadosDeLaBusqueda
                .filter(([n]) => n > 0)
                .map(([n, uno, varios]) => plural(n, uno, varios))
                .join(" · ")}
              .{ubicados.noEncontrados > 0 && " Corrige su domicilio en su ficha: están en «Sin ubicación» del Directorio."}
            </p>
          )}
          {ubicados.noEncontrados > 0 && (
            <Link href="/crm/contacts?ubicacion=sin" className="inline-flex min-h-11 items-center text-sm font-bold text-blue-700 underline">
              Ver los que no se encontraron
            </Link>
          )}
          {avisoUbicacion && (
            <p role="status" className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm font-medium text-amber-900">
              {avisoUbicacion}
            </p>
          )}
          {porUbicar.length > 0 &&
            (ubicando ? (
              <button
                type="button"
                onClick={() => {
                  detener.current = true;
                }}
                className="min-h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700"
              >
                <Loader2 size={16} className="animate-spin" /> Buscando… Detener
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void ubicar()}
                className="min-h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold shadow-md"
              >
                <MapPin size={16} /> Ubicar por domicilio
              </button>
            ))}
        </section>
      )}
    </div>
  );
}

function Cifra({ valor, texto, color }: { valor: number; texto: string; color: string }) {
  return (
    <div className={`rounded-xl border p-2.5 ${color}`}>
      <p className="text-xl font-black">{valor.toLocaleString("es-MX")}</p>
      <p className="text-xs font-bold leading-tight">{texto}</p>
    </div>
  );
}

function RenglonDeLaLista({ revisado, nombre }: { revisado: RenglonRevisado; nombre: string }) {
  const r = revisado;
  const detalle =
    r.estado === "listo"
      ? r.ubicacion === "punto"
        ? `En su punto · sección ${r.seccion} · ${r.municipio}`
        : r.ubicacion === "seccion"
          ? `En su sección (${r.seccion}); se buscará su domicilio · ${r.municipio}`
          : `Se buscará por su domicilio · ${r.municipio}`
      : r.motivo;
  const color = r.estado === "listo" ? "text-emerald-700" : r.estado === "repetido" ? "text-amber-800" : "text-red-700";
  return (
    <li className="px-3 py-2.5 text-sm">
      <p className="font-bold text-slate-900 break-words">
        <span className="text-slate-500 font-medium">Renglón {r.renglon} · </span>
        {nombre || "Sin nombre"}
      </p>
      <p className={`${color} break-words`}>{detalle}</p>
      {r.estado === "repetido" && r.contactoExistenteId && (
        // En su renglón y de 44 px: en el teléfono se toca con el dedo.
        <Link href={`/crm/contacts/${r.contactoExistenteId}`} className="inline-flex min-h-11 items-center font-bold text-amber-900 underline">
          Ver ficha
        </Link>
      )}
    </li>
  );
}
