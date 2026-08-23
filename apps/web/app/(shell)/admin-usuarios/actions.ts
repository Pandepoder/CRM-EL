"use server";

import { revalidatePath } from "next/cache";
import { getDatabaseClient } from "@/lib/db-client";
import { changeUserRole } from "@tonala/modules/governance/application";
import { actorFromSession, permissionChecker } from "@/lib/api-helpers";

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
