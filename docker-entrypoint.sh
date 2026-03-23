#!/bin/sh
set -e

echo "▶ Garantindo diretórios de dados..."
mkdir -p /app/data/user-photos
echo "  user-photos: $(ls /app/data/user-photos/ 2>/dev/null | wc -l) arquivo(s)"

echo "▶ Sincronizando schema do banco..."
node node_modules/prisma/build/index.js db push --schema=./prisma/schema.prisma --accept-data-loss --skip-generate

echo "▶ Verificando admin e permissões..."
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();
    (async () => {
      // 1. Migrar usuários ADMIN → SUPER_ADMIN
      const migrated = await prisma.user.updateMany({
        where: { role: 'ADMIN' },
        data: { role: 'SUPER_ADMIN' }
      });
      if (migrated.count > 0) console.log('Migrados ' + migrated.count + ' usuários ADMIN → SUPER_ADMIN');

      // 2. Criar/atualizar admin principal
      const existing = await prisma.user.findUnique({ where: { email: process.env.ADMIN_EMAIL } });
      if (!existing) {
        const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
        await prisma.user.create({
          data: { email: process.env.ADMIN_EMAIL, password: hash, name: 'Administrador', role: 'SUPER_ADMIN' }
        });
        console.log('Admin criado: ' + process.env.ADMIN_EMAIL);
      } else if (existing.role !== 'SUPER_ADMIN') {
        await prisma.user.update({ where: { id: existing.id }, data: { role: 'SUPER_ADMIN' } });
        console.log('Usuário promovido a SUPER_ADMIN: ' + process.env.ADMIN_EMAIL);
      } else {
        console.log('Admin já existe: ' + process.env.ADMIN_EMAIL);
      }

      if (existing && existing.name === 'Admin') {
        await prisma.user.update({ where: { id: existing.id }, data: { name: process.env.ADMIN_EMAIL.split('@')[0] } });
        console.log('Nome do admin atualizado');
      }

      // 3. Criar permissões padrão (idempotente)
      const defaultPermissions = [
        { resource: 'document:slides', minRole: 'MEMBER' },
        { resource: 'document:infographic', minRole: 'MEMBER' },
        { resource: 'document:audio_overview', minRole: 'MEMBER' },
        { resource: 'document:ai_summary', minRole: 'SUBSCRIBER' },
        { resource: 'document:transcript', minRole: 'ADMIN' },
        { resource: 'menu:planning', minRole: 'MEMBER' },
        { resource: 'menu:reports', minRole: 'MEMBER' },
        { resource: 'menu:admin', minRole: 'ADMIN' },
      ];
      for (const perm of defaultPermissions) {
        await prisma.permission.upsert({
          where: { resource: perm.resource },
          update: {},
          create: perm
        });
      }
      console.log('Permissões padrão verificadas (' + defaultPermissions.length + ')');

      await prisma.\$disconnect();
    })().catch(e => { console.error('Erro no seed:', e.message); });
  "
fi

echo "▶ Iniciando aplicação..."
exec node server.js
