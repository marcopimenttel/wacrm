/**
 * Gera JWT_SECRET + ANON_KEY + SERVICE_ROLE_KEY (HS256) para stack self-hosted.
 *
 * Uso:
 *   node scripts/generate-supabase-keys.mjs
 *   node scripts/generate-supabase-keys.mjs --secret=seu-segredo-32+chars
 *
 * Cole a saída no Coolify (resource wacrm-api + app).
 */

import crypto from "node:crypto";

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (a.startsWith("--secret=")) out.secret = a.slice("--secret=".length);
  }
  return out;
}

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function signHs256(secret, role, expYears = 10) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: "HS256", typ: "JWT" });
  const payload = b64url({
    role,
    iss: "supabase",
    iat: now,
    exp: now + 60 * 60 * 24 * 365 * expYears,
  });
  const data = `${header}.${payload}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

const args = parseArgs(process.argv.slice(2));
const jwtSecret =
  args.secret && args.secret.length >= 32
    ? args.secret
    : crypto.randomBytes(32).toString("base64url");

if (jwtSecret.length < 32) {
  console.error("JWT_SECRET precisa ter pelo menos 32 caracteres.");
  process.exit(1);
}

const anonKey = signHs256(jwtSecret, "anon");
const serviceRoleKey = signHs256(jwtSecret, "service_role");
const secretKeyBase = crypto.randomBytes(48).toString("base64url");

console.log(`
# --- Cole no Coolify (wacrm-api + rebuild do app) ---
JWT_SECRET=${jwtSecret}
ANON_KEY=${anonKey}
SERVICE_ROLE_KEY=${serviceRoleKey}
SECRET_KEY_BASE=${secretKeyBase}

# App (após API no ar):
NEXT_PUBLIC_SUPABASE_URL=https://api.crm.euapoio.cloud
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}
`.trim());
