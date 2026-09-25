#!/bin/sh
# Aplica bootstrap + migrations no Postgres (uso via Docker)
set -u
URL="$1"
echo "==> bootstrap"
psql "$URL" -v ON_ERROR_STOP=0 -f /work/deploy/coolify/onda-d/init/01-bootstrap-roles.sql || true
for f in /work/supabase/migrations/*.sql; do
  echo "==> $f"
  if ! psql "$URL" -v ON_ERROR_STOP=1 -f "$f"; then
    echo "AVISO: falhou $f"
  fi
done
echo "DONE"
