import { redirect } from "next/navigation";

import { destroyServerSession } from "@/lib/session-server";

export async function POST() {
  await destroyServerSession();
  redirect("/login");
}
