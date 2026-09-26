/**
 * Foto de perfil de una persona de la estructura o, sin foto, sus iniciales (3.6). La misma pieza
 * en la ficha y en las listas del equipo, para que una foto nueva se vea igual en todas.
 */
export function AvatarPersona({
  nombre,
  fotoUrl,
  tamano = 32,
  className = ""
}: {
  nombre: string;
  fotoUrl?: string | null | undefined;
  /** Lado en píxeles. */
  tamano?: number;
  className?: string;
}) {
  const estilo = { width: tamano, height: tamano, fontSize: Math.max(10, Math.round(tamano * 0.36)) };
  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt=""
        width={tamano}
        height={tamano}
        loading="lazy"
        style={estilo}
        className={`rounded-full object-cover shrink-0 bg-gray-100 ${className}`}
      />
    );
  }
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const iniciales = ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      style={estilo}
      className={`rounded-full shrink-0 inline-flex items-center justify-center font-black bg-blue-100 text-blue-800 ${className}`}
    >
      {iniciales}
    </span>
  );
}
