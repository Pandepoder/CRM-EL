import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import PublicRegistrationClient from "./PublicRegistrationClient";

export default async function PublicRegistrationPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDatabaseClient();

  const userRows = await db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName,
      accessType: schema.userProfiles.accessType,
      personalSlug: schema.userProfiles.personalSlug
    })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.personalSlug, slug.toLowerCase()))
    .limit(1);

  const hostUser = userRows[0];
  if (!hostUser) {
    return notFound();
  }

  // Load colonies for autocomplete
  const colonies = await db
    .select({
      id: schema.colonies.id,
      name: schema.colonies.name,
      postalCode: schema.colonies.postalCode
    })
    .from(schema.colonies)
    .where(eq(schema.colonies.status, "active"))
    .limit(300);

  return (
    <PublicRegistrationClient
      hostUser={hostUser}
      slug={slug}
      coloniesList={colonies.map(c => c.name)}
    />
  );
}
