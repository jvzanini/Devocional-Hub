---
name: api-design
description: Projetar API routes do DevocionalHub seguindo padroes do Next.js App Router
---

# API Design — DevocionalHub

## Objetivo
Projetar e implementar API routes para o DevocionalHub usando Next.js 16 App Router, Prisma 5, e autenticacao NextAuth v5.

## Stack da API
- **Framework**: Next.js 16 App Router (`src/app/api/[...]/route.ts`)
- **ORM**: Prisma 5 com PostgreSQL 16
- **Autenticacao**: NextAuth v5 beta (JWT strategy, credentials provider)
- **Roles**: ADMIN e MEMBER

## Estrutura de uma API Route

### Localizacao
```
src/app/api/<dominio>/<recurso>/route.ts
```
Exemplos existentes: `src/app/api/sessions/route.ts`, `src/app/api/admin/users/route.ts`, `src/app/api/pipeline/run/route.ts`.

### Template Padrao
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    // Para endpoints admin:
    // if (session.user.role !== "ADMIN") {
    //   return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    // }

    const data = await prisma.model.findMany({
      select: { id: true, name: true }, // Apenas campos necessarios
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
```

## Regras de Design

### Autenticacao e Autorizacao
1. **Toda rota protegida** deve chamar `auth()` de `@/features/auth/lib/auth`.
2. Verificar `session?.user` para rotas autenticadas (retornar 401 se ausente).
3. Verificar `session.user.role === "ADMIN"` para rotas administrativas (retornar 403 se nao admin).
4. Rotas publicas (webhook, convite) nao precisam de session, mas devem ter outra protecao (token, secret).

### Prisma Queries
1. Usar `select` ou `include` para limitar campos retornados — nunca retornar o modelo inteiro sem necessidade.
2. Usar `findUnique` com campos unicos, `findFirst` para buscas flexiveis, `findMany` para listas.
3. Transacoes (`prisma.$transaction`) para operacoes que alteram multiplos registros.
4. Importar prisma de `@/shared/lib/db` (singleton).

### Respostas
1. Sempre retornar `NextResponse.json()` com status code adequado.
2. Status codes: 200 (sucesso), 201 (criado), 400 (request invalido), 401 (nao autenticado), 403 (sem permissao), 404 (nao encontrado), 500 (erro interno).
3. Formato de erro: `{ error: "Mensagem em portugues" }`.
4. Formato de sucesso: dados diretos ou `{ success: true, data: ... }`.

### Validacao de Input
1. Validar corpo do request com verificacoes manuais (projeto nao usa Zod atualmente).
2. Verificar campos obrigatorios antes de processar.
3. Sanitizar strings de entrada quando necessario.

### Webhooks
1. Webhooks Zoom usam `src/app/api/webhook/zoom/route.ts`.
2. Validar secret/token do webhook antes de processar.
3. Retornar 200 rapidamente e processar em background quando possivel.

## Dominios de API Existentes
- **auth**: Login, registro, convite, sessao do usuario.
- **sessions**: CRUD de sessoes devocionais, presenca, documentos.
- **pipeline**: Execucao do pipeline de processamento de IA.
- **admin**: Gerenciamento de usuarios, configuracoes, webhooks.
- **zoom**: Integracao OAuth, gravacoes, participantes.
- **webhook**: Recepcao de eventos externos (Zoom meeting.ended).

## Convencoes
- Nomes de rota em ingles (padrao Next.js), mensagens de resposta em portugues.
- Um arquivo `route.ts` por endpoint.
- Logica de negocio pesada deve ficar em `src/features/<dominio>/lib/`, nao na route.
- Route handlers sao finos: validam input, chamam service, retornam resposta.
