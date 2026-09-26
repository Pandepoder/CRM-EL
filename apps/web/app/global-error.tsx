"use client";

/**
 * Última red: se muestra cuando lo que falla es el propio layout raíz, no una pantalla.
 *
 * Next reemplaza TODO el documento con este componente, así que tiene que traer sus propios
 * `<html>` y `<body>`. Va deliberadamente sin importar `globals.css`, sin iconos y sin ningún
 * componente compartido: si el fallo viene de la hoja de estilos o de un componente del
 * layout, importarlos aquí haría que esta pantalla fallara también y se volvería a ver el
 * texto crudo de Next. Por eso los estilos van en línea y el marcado es mínimo.
 */
export default function GlobalError({
  error,
  reset
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#0b1f3a",
          color: "#162235",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        }}
      >
        <main
          role="alert"
          style={{
            width: "100%",
            maxWidth: "460px",
            background: "#ffffff",
            borderRadius: "24px",
            padding: "32px 24px",
            textAlign: "center",
            boxShadow: "0 18px 45px rgba(11, 31, 58, .35)"
          }}
        >
          <h1 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 800 }}>
            El sistema no pudo arrancar
          </h1>
          <p style={{ margin: "0 0 24px", fontSize: "14px", lineHeight: 1.5, color: "#64748b" }}>
            No es tu teléfono ni tu cuenta. Vuelve a intentarlo en un momento y, si sigue igual,
            avisa a quien te dio el acceso.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              width: "100%",
              padding: "14px 20px",
              border: "none",
              borderRadius: "12px",
              background: "#1f5c9b",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Reintentar
          </button>

          {error.digest ? (
            <p style={{ margin: "20px 0 0", fontSize: "11px", color: "#64748b" }}>
              Clave del fallo: <span style={{ fontFamily: "monospace" }}>{error.digest}</span>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
