import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";

import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import UnirmeForm from "./UnirmeForm";

/**
 * Página pública de "únete a mi brigada".
 *
 * Es el segundo QR de cada persona. El primero, `/registro/su-nombre`, registra
 * ciudadanos; este suma gente que va a trabajar. Antes no existía: quien quería
 * entrar a una brigada se registraba por su cuenta en `/register` y la solicitud
 * llegaba anónima, sin saber quién lo trajo ni a qué equipo iba.
 */
export default async function UnirmePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDatabaseClient();

  const anfitriones = await db
    .select({ id: schema.userProfiles.id, displayName: schema.userProfiles.displayName })
    .from(schema.userProfiles)
    .where(
      and(
        eq(schema.userProfiles.personalSlug, slug.toLowerCase()),
        eq(schema.userProfiles.status, "active")
      )
    )
    .limit(1);

  const anfitrion = anfitriones[0];
  if (!anfitrion) return notFound();

  // La brigada que se muestra es la misma que asignará la ruta de alta: primero
  // la que lidera, si no, aquella a la que pertenece.
  const lideradas = await db
    .select({ name: schema.teams.name })
    .from(schema.teams)
    .where(eq(schema.teams.leaderId, anfitrion.id))
    .limit(1);

  let equipo = lideradas[0]?.name ?? null;
  if (!equipo) {
    const pertenece = await db
      .select({ name: schema.teams.name })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teams.id, schema.teamMembers.teamId))
      .where(eq(schema.teamMembers.userId, anfitrion.id))
      .limit(1);
    equipo = pertenece[0]?.name ?? null;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: "#f7f8fb" }}>
      <section
        style={{
          background: "linear-gradient(155deg, #0b1f3a 0%, #12305c 58%, #16407a 100%)",
          color: "#fff"
        }}
      >
        <div className="max-w-md mx-auto px-6 pt-10 pb-9 text-center">
          <img
            src="/brand/el-monograma-blanco.png"
            alt="Edgar López"
            width={44}
            height={44}
            style={{ width: 44, height: 44, objectFit: "contain", margin: "0 auto 1.1rem" }}
          />
          <p
            className="text-[11px] font-bold uppercase mb-2.5"
            style={{ letterSpacing: ".16em", color: "#93c5fd" }}
          >
            Te invita {anfitrion.displayName}
          </p>
          <h1
            className="font-extrabold tracking-tight"
            style={{ fontSize: "clamp(1.6rem, 6vw, 2.1rem)", lineHeight: 1.12, textWrap: "balance" }}
          >
            {equipo ? `Súmate a ${equipo}` : "Súmate a la estructura"}
          </h1>
          <p className="mt-3" style={{ color: "#c8d6ec", fontSize: ".97rem", lineHeight: 1.55 }}>
            Regístrate en un minuto y empieza a trabajar el territorio de Tonalá.
          </p>
        </div>
      </section>

      <main className="flex-1">
        <div className="max-w-md mx-auto px-6 py-8">
          <div
            className="rounded-2xl p-5 sm:p-6"
            style={{ background: "#fff", border: "1px solid #e6eaf2", boxShadow: "0 18px 40px -30px rgba(11,31,58,.5)" }}
          >
            <UnirmeForm slug={slug} anfitrion={anfitrion.displayName} equipo={equipo} />
          </div>

          <p className="text-center text-sm mt-6" style={{ color: "#5b6780" }}>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-semibold" style={{ color: "#1f4fb8" }}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </main>

      <footer className="py-6 px-6 text-center" style={{ background: "#fff", borderTop: "1px solid #e6eaf2" }}>
        <p style={{ color: "#8b95a9", fontSize: ".8rem" }}>© 2026 Edgar López · Un Tonalá Posible</p>
      </footer>
    </div>
  );
}
