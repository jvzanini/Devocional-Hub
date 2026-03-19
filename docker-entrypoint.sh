#!/bin/sh
set -e

echo "▶ Sincronizando schema do banco..."
node node_modules/prisma/build/index.js db push --schema=./prisma/schema.prisma --accept-data-loss --skip-generate

echo "▶ Verificando admin..."
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();
    (async () => {
      const existing = await prisma.user.findUnique({ where: { email: process.env.ADMIN_EMAIL } });
      if (!existing) {
        const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
        await prisma.user.create({
          data: { email: process.env.ADMIN_EMAIL, password: hash, name: 'Admin', role: 'ADMIN' }
        });
        console.log('Admin criado: ' + process.env.ADMIN_EMAIL);
      } else if (existing.role !== 'ADMIN') {
        await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
        console.log('Usuário promovido a ADMIN: ' + process.env.ADMIN_EMAIL);
      } else {
        console.log('Admin já existe: ' + process.env.ADMIN_EMAIL);
      }
      await prisma.\$disconnect();
    })().catch(e => { console.error('Erro no seed:', e.message); });
  "
fi

echo "▶ Iniciando aplicação..."
exec node server.js
