export function isPublicRegistrationAllowed(): boolean {
  return process.env.ALLOW_PUBLIC_REGISTRATION === "true";
}
