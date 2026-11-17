import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ConstelacionJalisco } from "@/components/ConstelacionJalisco";
import { EsloganAnimado } from "@/components/EsloganAnimado";
import { RedesPublicas } from "@/components/RedesPublicas";
import { ESLOGAN_EN_TEXTO, MARCA } from "@/lib/marca";

/**
 * La columna de marca de las pantallas de acceso (entrar y solicitar acceso): eslogan, retrato y
 * redes. En computadora ocupa media pantalla; en el teléfono se reduce a una franja arriba del formulario.
 */
export function MarcaAcceso({ volver }: { volver: { href: string; texto: string } }) {
  return (
    <section className="login-marca" aria-label={`${MARCA.firma}, Jalisco`}>
      <div className="pub-aurora" aria-hidden="true"><i /><i /><i /></div>
      <ConstelacionJalisco className="login-constelacion" />

      <header className="login-arriba">
        <Link href={volver.href} className="login-volver">
          <ArrowLeft size={17} aria-hidden="true" />
          <span>{volver.texto}</span>
        </Link>
        <span className="login-firma">
          <Image src={MARCA.monograma.blanco} alt="" width={30} height={30} /> {MARCA.firma}
        </span>
      </header>

      <div className="login-marca-centro">
        <div className="login-marca-texto">
          <p className="login-ceja">JALISCO</p>
          <h2 className="login-eslogan">
            <span className="sr-only">{ESLOGAN_EN_TEXTO}</span>
            <EsloganAnimado />
          </h2>
        </div>
        {MARCA.retrato ? (
          <div className="pub-marco login-retrato">
            <div className="pub-marco-foto">
              <Image
                src={MARCA.retrato}
                alt={MARCA.referente.nombre}
                fill
                priority
                sizes="(max-width: 899px) 84px, 260px"
                className="login-retrato-imagen"
              />
              <span className="login-retrato-nombre">{MARCA.referente.corto}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="login-marca-pie">
        <span>{MARCA.lema}</span>
        <RedesPublicas />
      </div>
    </section>
  );
}
