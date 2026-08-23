import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { saveServerSession } from "@/lib/session-server";
import { isPublicRegistrationAllowed } from "@/lib/registration-policy";

export async function POST(request: Request) {
  if (!isPublicRegistrationAllowed()) {
    return NextResponse.json(
      { code: "registration_disabled", message: "El registro público no está habilitado." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as { displayName?: string; email?: string; password?: string };
    const displayName = body.displayName?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!displayName || !email || !password) {
      return NextResponse.json(
        { code: "validation_error", message: "Todos los campos son requeridos." },
        { status: 400 }
      );
    }

    const db = getDatabaseClient();

    // Check if email already exists
    const existing = await db.select({ id: schema.userProfiles.id }).from(schema.userProfiles).where(eq(schema.userProfiles.email, email)).limit(1);
    
    if (existing.length > 0) {
      return NextResponse.json(
        { code: "email_taken", message: "Este correo ya está registrado." },
        { status: 400 }
      );
    }

    // Get the default role for new users: 'visit_responsible' (Organizador)
    const roles = await db.select().from(schema.roles).where(eq(schema.roles.key, "visit_responsible")).limit(1);
    
    if (roles.length === 0) {
      return NextResponse.json(
        { code: "internal_error", message: "Error interno: No se encontró el rol por defecto." },
        { status: 500 }
      );
    }

    const role = roles[0]!;

    const passwordHash = await hashPassword(password);
    const userId = randomUUID();

    await db.insert(schema.userProfiles).values({
      id: userId,
      email,
      displayName,
      passwordHash,
      roleId: role.id,
      status: "active",
      version: 1
    });

    // Automatically log them in
    await saveServerSession({
      userId: userId,
      email: email,
      displayName: displayName,
      roleKey: role.key,
      roleName: role.name,
      isLoggedIn: true
    });

    return NextResponse.json({
      ok: true,
      redirectTo: "/onboarding"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    return NextResponse.json({ code: "registration_failed", message }, { status: 500 });
  }
}
