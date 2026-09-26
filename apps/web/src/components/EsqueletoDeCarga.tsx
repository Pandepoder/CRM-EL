/**
 * Esqueleto mientras una pantalla pesada se prepara en el servidor.
 *
 * Sin un `loading.tsx`, Next deja la pantalla anterior congelada hasta que la nueva termina de
 * prepararse en el servidor. Medido en esta aplicación: `/admin-usuarios` tarda más de cinco
 * segundos y `/logistica` cuatro. En un teléfono en la calle eso se lee como "no respondió el
 * toque" y la gente vuelve a tocar, que es justo lo que duplica registros.
 *
 * Solo cubre la espera del servidor. Las pantallas que traen sus datos desde el navegador —el
 * mapa pide ciudadanos e incidencias después de abrir— necesitan su propio indicador.
 *
 * Es un componente de servidor a propósito: no lleva estado ni JavaScript al cliente.
 */
export function EsqueletoDeCarga({
  titulo,
  filas = 5
}: Readonly<{ titulo: string; filas?: number }>) {
  return (
    <div className="px-4 py-6 sm:px-6" aria-busy="true" aria-live="polite">
      <p className="text-sm font-bold" style={{ color: "var(--muted)" }}>
        {titulo}
      </p>

      <div className="mt-4 space-y-3">
        {Array.from({ length: filas }, (_, i) => (
          <div
            key={i}
            className="h-16 rounded-2xl border animate-pulse"
            style={{ borderColor: "var(--line)", background: "var(--soft)" }}
          />
        ))}
      </div>
    </div>
  );
}
