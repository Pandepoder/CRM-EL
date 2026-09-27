import Link from "next/link";

/**
 * Dirección que no existe. Sin esta pantalla, Next devolvía su 404 en inglés y sin salida.
 *
 * Pasa más de lo que parece: enlaces viejos reenviados por WhatsApp, un QR impreso de una
 * persona que ya causó baja, o una ficha borrada. Lo importante es que no parezca un fallo
 * del sistema y que haya una puerta de vuelta.
 */
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--paper)"
      }}
    >
      <main
        className="w-full max-w-md rounded-3xl border bg-white p-8 text-center"
        style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-soft)" }}
      >
        <p className="text-4xl font-black" style={{ color: "var(--blue-700)" }}>
          404
        </p>
        <h1 className="mt-2 text-xl font-black" style={{ color: "var(--ink)" }}>
          Esta página no existe
        </h1>
        <p className="mt-2 text-sm font-medium" style={{ color: "var(--muted)" }}>
          Puede que el enlace esté mal escrito, que sea de una versión anterior o que el
          registro al que apunta ya no esté disponible.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white"
          style={{ background: "var(--blue-700)" }}
        >
          Ir al inicio
        </Link>
      </main>
    </div>
  );
}
