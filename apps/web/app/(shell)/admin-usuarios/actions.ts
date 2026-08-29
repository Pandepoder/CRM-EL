"use server";

import { revalidatePath } from "next/cache";
import { getDatabaseClient } from "@/lib/db-client";
import { changeUserRole } from "@tonala/modules/governance/application";
import { actorFromSession, permissionChecker } from "@/lib/api-helpers";
import { hashPassword } from "@/lib/auth";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function createUserAction(formData: FormData) {
  const actor = await actorFromSession();
  if (!actor || !actor.roles.includes("admin")) {
    throw new Error("No tienes permisos para crear usuarios.");
  }

  const displayName = (formData.get("displayName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const roleId = formData.get("roleId") as string;

  if (!displayName || !email || !password || !roleId) {
    throw new Error("Todos los campos son obligatorios.");
  }

  if (password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }

  const db = getDatabaseClient();

  // Verificar si el correo ya existe
  const existing = await db
    .select({ id: schema.userProfiles.id })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Ya existe un usuario registrado con este correo.");
  }

  const passwordHash = await hashPassword(password);
  const userId = randomUUID();

  await db.insert(schema.userProfiles).values({
    id: userId,
    email,
    displayName,
    passwordHash,
    roleId,
    status: "active",
    version: 1
  });

  revalidatePath("/admin-usuarios");
  return { ok: true };
}

export async function approveUserAction(formData: FormData) {
  const actor = await actorFromSession();
  if (!actor || !actor.roles.includes("admin")) {
    throw new Error("No tienes permisos para autorizar solicitudes.");
  }

  const userId = formData.get("userId") as string;
  const roleId = formData.get("roleId") as string;

  if (!userId || !roleId) {
    throw new Error("Datos de aprobación incompletos.");
  }

  const db = getDatabaseClient();

  await db
    .update(schema.userProfiles)
    .set({
      roleId,
      status: "active",
      updatedAt: new Date()
    })
    .where(eq(schema.userProfiles.id, userId));

  revalidatePath("/admin-usuarios");
  return { ok: true };
}

export async function rejectUserAction(userId: string) {
  const actor = await actorFromSession();
  if (!actor || !actor.roles.includes("admin")) {
    throw new Error("No tienes permisos para rechazar solicitudes.");
  }

  if (!userId) {
    throw new Error("ID de usuario requerido.");
  }

  const db = getDatabaseClient();

  await db
    .delete(schema.userProfiles)
    .where(eq(schema.userProfiles.id, userId));

  revalidatePath("/admin-usuarios");
  return { ok: true };
}

export async function resetUserPasswordAction(formData: FormData) {
  const actor = await actorFromSession();
  if (!actor || !actor.roles.includes("admin")) {
    throw new Error("No tienes permisos para restablecer contraseñas.");
  }

  const userId = formData.get("userId") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!userId || !newPassword) {
    throw new Error("Faltan datos requeridos.");
  }

  if (newPassword.length < 6) {
    throw new Error("La nueva contraseña debe tener al menos 6 caracteres.");
  }

  const passwordHash = await hashPassword(newPassword);
  const db = getDatabaseClient();

  await db
    .update(schema.userProfiles)
    .set({
      passwordHash,
      updatedAt: new Date()
    })
    .where(eq(schema.userProfiles.id, userId));

  revalidatePath("/admin-usuarios");
  return { ok: true };
}

export async function changeUserRoleAction(formData: FormData) {
  const actor = await actorFromSession();
  if (!actor) throw new Error("Unauthorized");

  const userId = formData.get("userId") as string;
  const newRoleId = formData.get("roleId") as string;

  if (!userId || !newRoleId) {
    throw new Error("Missing data");
  }

  const db = getDatabaseClient();
  const result = await changeUserRole(
    actor,
    { userId, roleId: newRoleId },
    { db, permissionChecker }
  );

  if (!result.ok) {
    throw new Error(result.error.publicMessage ?? "No se pudo cambiar el rol.");
  }

  revalidatePath("/admin-usuarios");
}

export async function deactivateUserAction(userId: string) {
  const actor = await actorFromSession();
  if (!actor || !actor.roles.includes("admin")) throw new Error("Unauthorized");

  const db = getDatabaseClient();

  await db
    .update(schema.userProfiles)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(eq(schema.userProfiles.id, userId));

  revalidatePath("/admin-usuarios");
}

export async function activateUserAction(userId: string) {
  const actor = await actorFromSession();
  if (!actor || !actor.roles.includes("admin")) throw new Error("Unauthorized");

  const db = getDatabaseClient();

  await db
    .update(schema.userProfiles)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(schema.userProfiles.id, userId));

  revalidatePath("/admin-usuarios");
}

export async function updateUserAction(formData: FormData) {
  const actor = await actorFromSession();
  if (!actor || !actor.roles.includes("admin")) throw new Error("Unauthorized");

  const userId = formData.get("userId") as string;
  const displayName = (formData.get("displayName") as string)?.trim();

  if (!userId || !displayName) {
    throw new Error("Datos requeridos incompletos.");
  }

  const db = getDatabaseClient();

  await db
    .update(schema.userProfiles)
    .set({ displayName, updatedAt: new Date() })
    .where(eq(schema.userProfiles.id, userId));

  revalidatePath("/admin-usuarios");
  return { ok: true };
}
