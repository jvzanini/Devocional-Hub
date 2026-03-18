#!/bin/sh
set -e

echo "▶ Rodando migrations do banco..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "▶ Iniciando aplicação..."
exec node server.js
