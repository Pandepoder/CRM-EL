import Link from "next/link";

/**
 * Lo mismo que el 404 de la raíz, pero dentro del panel: el menú sigue en pie porque vive en
 * el layout, así que quien llega aquí desde una ficha borrada puede seguir trabajando sin
 * volver a entrar.
 *
 * Lo usan las pantallas que llaman a `notFound()` cuando el registro no existe o queda fuera
 * del alcance de quien consulta —el perfil de alguien de otra estructura, por ejemplo—.
 */
export default function NotFound() {
  return (
    <div className="flex items-start justify-center px-4 py-10 sm:py-16">
      <main
        className="w-full max-w-lg rounded-3xl border bg-white p-6 sm:p-8 text-center"
        style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-soft)" }}
      >
        <h1 className="text-xl sm:text-2xl font-black" style={{ color: "var(--ink)" }}>
          No encontramos ese registro
        </h1>
        <p className="mt-2 text-sm font-medium" style={{ color: "var(--muted)" }}>
          O no existe, o está fuera de lo que puedes ver desde tu equipo. Si crees que
          deberías verlo, pídeselo a quien coordina tu estructura.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white"
          style={{ background: "var(--blue-700)" }}
        >
          Volver a mi inicio
        </Link>
      </main>
    </div>
  );
}
