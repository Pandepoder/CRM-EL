import { Suspense } from "react";
import { FileClock, Lock, ShieldCheck, UsersRound } from "lucide-react";

import "../publico.css";

import { FormularioAcceso } from "./FormularioAcceso";
import { MarcaAcceso } from "@/components/MarcaAcceso";
import { tipografiaPublica } from "@/lib/tipografia-publica";

/**
 * Lo que de verdad hace el sistema con los datos, sin promesas de más: `contacts.display_name` va en
 * claro para poder buscar, por eso aquí se habla de teléfonos y domicilios y no de «todo cifrado».
 */
const GARANTIAS = [
  { icono: Lock, texto: "Teléfonos y domicilios cifrados" },
  { icono: UsersRound, texto: "Cada quien ve solo lo que le toca" },
  { icono: FileClock, texto: "Lo delicado queda registrado" }
];

export default function LoginPage() {
  return (
    <main className={`pub login-pub ${tipografiaPublica.className}`}>
      <MarcaAcceso volver={{ href: "/conoceme", texto: "Volver a la bienvenida" }} />

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-panel-interior">
          <div className="login-encabezado">
            <span className="login-escudo"><ShieldCheck size={24} aria-hidden="true" /></span>
            <span className="login-etiqueta">TU ESPACIO DE TRABAJO</span>
            <h1 id="login-title">Qué gusto verte<br /><span>de nuevo.</span></h1>
            <p>Inicia sesión para continuar con tu equipo.</p>
          </div>

          <Suspense fallback={<p role="status">Cargando formulario…</p>}><FormularioAcceso /></Suspense>

          <ul className="login-garantias">
            {GARANTIAS.map(({ icono: Icono, texto }) => (
              <li key={texto}>
                <span><Icono size={16} aria-hidden="true" /></span>
                {texto}
              </li>
            ))}
          </ul>

          <p className="login-nota"><Lock size={13} aria-hidden="true" /> Acceso para integrantes autorizados</p>
          <footer className="login-pie">EL · Jalisco OS <span>Conecta. Organiza. Da seguimiento.</span></footer>
        </div>
      </section>
    </main>
  );
}
