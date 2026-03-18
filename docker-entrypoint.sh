#!/bin/sh
set -e

echo "▶ Sincronizando schema do banco..."
node node_modules/prisma/build/index.js db push --schema=./prisma/schema.prisma --accept-data-loss

echo "▶ Iniciando aplicação..."
exec node server.js
