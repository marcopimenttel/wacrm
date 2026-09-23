/**
 * Aplica supabase/migrations/*.sql em um Postgres via DATABASE_URL.
 *
 * Uso:
 *   DATABASE_URL=postgresql://user:pass@host:5432/db node scripts/apply-migrations.mjs
 *
 * Requer: `psql` no PATH (cliente PostgreSQL).
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Defina DATABASE_URL");
  process.exit(1);
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Aplicando ${files.length} migrations em ${databaseUrl.replace(/:[^:@]+@/, ":***@")}`);

const bootstrapSql = path.join(
  root,
  "deploy",
  "coolify",
  "onda-d",
  "init",
  "01-bootstrap-roles.sql",
);

// Bootstrap extensions + roles/schemas (Onda D) ou stub mínimo
if (fs.existsSync(bootstrapSql)) {
  console.log("--> bootstrap Onda D (roles/schemas)");
  try {
    execFileSync(
      "psql",
      [databaseUrl, "-v", "ON_ERROR_STOP=0", "-f", bootstrapSql],
      { stdio: "inherit" },
    );
  } catch {
    console.warn("AVISO: bootstrap parcial (roles podem já existir).");
  }
} else {
  execFileSync(
    "psql",
    [
      databaseUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
       CREATE EXTENSION IF NOT EXISTS "pgcrypto";
       CREATE SCHEMA IF NOT EXISTS auth;
       CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY, email TEXT);`,
    ],
    { stdio: "inherit" },
  );
}

for (const file of files) {
  const full = path.join(migrationsDir, file);
  console.log(`--> ${file}`);
  try {
    execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", full], {
      stdio: "inherit",
    });
  } catch {
    console.warn(`AVISO: falha ao aplicar ${file} (verifique dependências).`);
  }
}

console.log("Concluído.");
