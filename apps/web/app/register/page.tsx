import "../publico.css";

import { FormularioRegistro } from "./FormularioRegistro";
import { MarcaAcceso } from "@/components/MarcaAcceso";
import { tipografiaPublica } from "@/lib/tipografia-publica";

/** Solicitar acceso: misma casa que la pantalla de entrar, para que se reconozca como el mismo sistema. */
export default function RegisterPage() {
  return (
    <main className={`pub login-pub ${tipografiaPublica.className}`}>
      <MarcaAcceso volver={{ href: "/login", texto: "Volver a iniciar sesión" }} />

      <section className="login-panel" aria-labelledby="registro-titulo">
        <div className="login-panel-interior">
          <FormularioRegistro />
          <footer className="login-pie">EL · Jalisco OS <span>Conecta. Organiza. Da seguimiento.</span></footer>
        </div>
      </section>
    </main>
  );
}
