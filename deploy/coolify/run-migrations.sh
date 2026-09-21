#!/bin/sh
# Aplica migrations SQL em ordem numérica no Postgres da VPS.
set -eu

echo "==> Aguardando Postgres..."
until pg_isready -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; do
  sleep 1
done

echo "==> Aplicando extensions..."
psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SQL

# Schema auth mínimo para migrations que referenciam auth.users
# (quando GoTrue ainda não criou o schema).
psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY,
  email TEXT
);
SQL

echo "==> Rodando migrations..."
for f in $(ls /migrations/*.sql | sort); do
  echo "--> $f"
  psql -v ON_ERROR_STOP=1 -f "$f" || {
    echo "AVISO: falha em $f (pode ser idempotente / dependência auth). Continuando..."
  }
done

echo "==> Migrations concluídas."
