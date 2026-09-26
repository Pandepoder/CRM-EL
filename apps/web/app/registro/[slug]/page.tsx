import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BienvenidaConoceme } from "@/components/BienvenidaConoceme";
import { municipioDelUsuario } from "@/lib/municipio-usuario";
import PublicRegistrationClient from "./PublicRegistrationClient";

export default async function PublicRegistrationPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ modo?: string }>;
}) {
  const { slug } = await params;
  const { modo } = await searchParams;
  const db = getDatabaseClient();

  const userRows = await db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName
    })
    .from(schema.userProfiles)
    .where(
      and(
        eq(schema.userProfiles.personalSlug, slug.toLowerCase()),
        eq(schema.userProfiles.status, "active")
      )
    )
    .limit(1);

  const hostUser = userRows[0];
  if (!hostUser) {
    return notFound();
  }

  // Aquí se consultaban 300 colonias en cada escaneo del QR para pasárselas al formulario, que no
  // las usaba (R19): una consulta de más por persona en la página pública con más carga.

  // Modo evento (kiosco): quien opera el teléfono de la brigada registra a una persona tras otra con
  // municipio y sección ya puestos. `/registro/<enlace>?modo=evento`, desde «Tu enlace» del panel.
  const modoEvento = modo === "evento";
  // El municipio de quien comparte el enlace sale ya elegido: es donde trabaja su brigada y el que
  // se le asignaría al ciudadano sin dato (etapa 5). La persona lo cambia si vive en otro.
  const municipioSugerido = await municipioDelUsuario(hostUser.id);

  return (
    <>
      {/* Quien escanea el QR en la calle ve primero de quien es la campana. En modo evento no: el
          teléfono lo opera la brigada y cada pantalla de más es una persona más en la fila. */}
      {!modoEvento && (
        <BienvenidaConoceme
          clave="registro"
          accion="Continuar al registro"
          invitadoPor={hostUser.displayName}
        />
      )}
      <PublicRegistrationClient hostUser={hostUser} slug={slug} modoEvento={modoEvento} municipioSugerido={municipioSugerido} />
    </>
  );
}
