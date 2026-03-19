#!/bin/sh
set -e

echo "▶ Sincronizando schema do banco..."
node node_modules/prisma/build/index.js db push --schema=./prisma/schema.prisma --accept-data-loss --skip-generate

echo "▶ Iniciando CRON worker em background..."
sh /app/cron-worker.sh &

echo "▶ Iniciando aplicação..."
exec node server.js
