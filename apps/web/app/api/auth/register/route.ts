import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { 
      displayName?: string; 
      email?: string; 
      password?: string;
      phone?: string;
    };
    const displayName = body.displayName?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!displayName || !email || !password) {
      return NextResponse.json(
        { code: "validation_error", message: "Todos los campos obligatorios deben completarse." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { code: "validation_error", message: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const db = getDatabaseClient();

    // Check if email already exists
    const existing = await db
      .select({ id: schema.userProfiles.id, status: schema.userProfiles.status })
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.email, email))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0]?.status === "pending") {
        return NextResponse.json(
          { code: "email_pending", message: "Ya existe una solicitud pendiente con este correo. Espera la autorización del Administrador." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { code: "email_taken", message: "Este correo ya está registrado en el sistema." },
        { status: 400 }
      );
    }

    // Default role for new registration requests: 'visit_responsible' (Brigadista/Organizador)
    const roles = await db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.key, "visit_responsible"))
      .limit(1);

    let roleId: string;
    if (roles.length > 0 && roles[0]) {
      roleId = roles[0].id;
    } else {
      const anyRole = await db.select().from(schema.roles).limit(1);
      if (anyRole.length === 0 || !anyRole[0]) {
        return NextResponse.json(
          { code: "internal_error", message: "Error interno: Catálogo de roles no inicializado." },
          { status: 500 }
        );
      }
      roleId = anyRole[0].id;
    }

    const passwordHash = await hashPassword(password);
    const userId = randomUUID();

    // Insert user with status 'pending'
    await db.insert(schema.userProfiles).values({
      id: userId,
      email,
      displayName,
      passwordHash,
      roleId,
      status: "pending",
      version: 1
    });

    return NextResponse.json({
      ok: true,
      pending: true,
      message: "¡Solicitud enviada con éxito! Tu cuenta está registrada y el Administrador revisará tu solicitud para activar tus privilegios."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al procesar el registro.";
    return NextResponse.json({ code: "registration_failed", message }, { status: 500 });
  }
}
