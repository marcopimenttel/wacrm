/**
 * Exporta schemas públicos + auth do Supabase Cloud (pg_dump) para restaurar na VPS.
 *
 * Requer: pg_dump no PATH + DATABASE_URL do Cloud (Connection string → URI).
 *
 * Uso:
 *   CLOUD_DATABASE_URL=postgresql://postgres....@db.xxx.supabase.co:5432/postgres \
 *     node scripts/export-cloud-db.mjs
 *
 * Gera: deploy/coolify/onda-d/exports/cloud-YYYYMMDD.sql
 *
 * NÃO inclui storage objects em disco — só metadados em storage.*;
 * mídia precisa de sync separado (rclone/S3) se houver arquivos importantes.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "deploy", "coolify", "onda-d", "exports");

const url = process.env.CLOUD_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Defina CLOUD_DATABASE_URL (URI do Postgres do projeto Cloud).");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const outFile = path.join(outDir, `cloud-${stamp}.sql`);

console.log("Exportando Cloud →", outFile);
execFileSync(
  "pg_dump",
  [
    url,
    "--no-owner",
    "--no-acl",
    "--schema=public",
    "--schema=auth",
    "--schema=storage",
    "-f",
    outFile,
  ],
  { stdio: "inherit" },
);

console.log(`
OK. Para restaurar na VPS (wacrm-db):

  psql "$DATABASE_URL" -f "${outFile.replace(/\\/g, "/")}"

Depois rode migrations faltantes se necessário:
  DATABASE_URL=... node scripts/apply-migrations.mjs
`.trim());
