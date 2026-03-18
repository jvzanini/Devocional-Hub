#!/bin/sh
set -e

echo "▶ Rodando migrations do banco..."
node node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma

echo "▶ Iniciando aplicação..."
exec node server.js
