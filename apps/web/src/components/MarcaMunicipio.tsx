/**
 * El municipio de un registro según su llave (migración 0022), con General bien a la vista.
 *
 * General quiere decir «sin municipio confirmado»: no se pudo ubicar al crear la llave, o se registró
 * sin datos para ubicarlo. Nunca se muestra como si fuera un municipio más: se marca, y se explica
 * dónde se asigna.
 */
export function MarcaMunicipio({ nombre, esGeneral }: { nombre: string | null | undefined; esGeneral: boolean }) {
  if (esGeneral || !nombre) {
    return (
      <span
        title="Sin municipio confirmado. Se asigna en Configuración → Sin municipio."
        className="inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-900"
      >
        General
      </span>
    );
  }
  return <span className="font-bold">{nombre}</span>;
}
