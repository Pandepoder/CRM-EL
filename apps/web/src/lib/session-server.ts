import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";

import { defaultSession, getSessionOptions, type SessionData } from "@/lib/session";

export async function getEdgeSession(
  request: NextRequest,
  response: Response
): Promise<SessionData> {
  const session = await getIronSession<SessionData>(request, response, getSessionOptions());
  return { ...defaultSession, ...session };
}

export async function getServerSession(): Promise<SessionData> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore as any,
    getSessionOptions()
  );
  return { ...defaultSession, ...session };
}

export async function saveServerSession(data: SessionData): Promise<void> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore as any,
    getSessionOptions()
  );
  Object.assign(session, data);
  await session.save();
}

export async function destroyServerSession(): Promise<void> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore as any,
    getSessionOptions()
  );
  session.destroy();
}
