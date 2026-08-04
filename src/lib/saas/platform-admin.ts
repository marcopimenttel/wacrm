/**
 * Helpers de plataforma (superadmin).
 *
 * Lista de e-mails em PLATFORM_ADMIN_EMAILS (separados por vírgula).
 * Sem a variável, ninguém é tratado como admin da plataforma.
 */

export function getPlatformAdminEmails(): string[] {
  // Aceita PLATFORM_ADMIN_EMAILS (servidor) ou a variante pública (UI).
  const raw =
    process.env.PLATFORM_ADMIN_EMAILS ??
    process.env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS ??
    "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  const allowed = getPlatformAdminEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}
