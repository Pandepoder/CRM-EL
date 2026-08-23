import type { SessionOptions } from "iron-session";

export type SessionData = Readonly<{
  userId: string;
  email: string;
  displayName: string;
  roleKey: string;
  roleName: string;
  isLoggedIn: boolean;
}>;

export const defaultSession: SessionData = {
  userId: "",
  email: "",
  displayName: "",
  roleKey: "",
  roleName: "",
  isLoggedIn: false
};

function sessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set with at least 32 characters.");
  }
  return secret;
}

export function getSessionOptions(): SessionOptions {
  return {
    password: sessionPassword(),
    cookieName: "tonala_session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    }
  };
}
