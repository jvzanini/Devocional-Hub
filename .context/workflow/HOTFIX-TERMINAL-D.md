# Terminal D — Etapa 7: Deploy & Validação

> **SEQUENCIAL — Executar APENAS após Terminais A, B e C finalizarem**
> **Escopo:** Validação, merge de conflitos, commit final, push, CI/CD, limpeza banco

## Referências
- CLAUDE.md na raiz do projeto

## Regras
- Responder SEMPRE em português brasileiro
- NUNCA commitar credenciais reais
- Validar com `npx prisma generate` + `npx tsc --noEmit` antes de commitar
- Deploy: push para `main` → CI/CD builda → Portainer atualiza
- Container leva ~30s para reiniciar após deploy

---

## Tasks

### 7.1 — Validação
1. `npx prisma generate` — confirmar sem erros
2. `npx tsc --noEmit` — corrigir quaisquer erros de tipo
3. Verificar que NÃO há credenciais no código: `grep -rn "sk-proj-\|sk-or-v1-\|AIzaSy\|GWhLJ" src/`
4. Resolver conflitos de merge se houver (entre terminais A, B, C)

### 7.2 — Commit final
```bash
git add -A
git commit -m "fix(v2.1): hotfix completo — 30+ correções de bugs e UI/UX

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

### 7.3 — Push e monitorar
```bash
git push origin main
gh run watch  # monitorar CI/CD
```

### 7.4 — Limpeza do banco em produção
Após o deploy e container reiniciar (~30s), chamar o endpoint de cleanup:
```bash
# O endpoint de cleanup foi criado pelo Terminal A
curl -X POST https://devocional.nexusai360.com/api/admin/cleanup \
  -H "Cookie: <session_cookie>"
```
Se o endpoint não existir, acessar o Portainer e executar no container:
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  await prisma.document.deleteMany();
  await prisma.participantEntry.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.session.deleteMany();
  console.log('Banco limpo.');
  await prisma.\$disconnect();
})();
"
```

### 7.5 — Validação em produção
```bash
curl -s -o /dev/null -w "%{http_code}" https://devocional.nexusai360.com/login
curl -s -o /dev/null -w "%{http_code}" https://devocional.nexusai360.com/api/bible/versions
```

### 7.6 — Checklist final
- [ ] Admin acessível para SUPER_ADMIN
- [ ] Bubble abre ao clicar
- [ ] Calendário com cores corretas
- [ ] Bíblia carrega texto
- [ ] Relatórios com filtros em linha
- [ ] Login com layout correto
- [ ] Banco limpo (sem sessões antigas)

### 7.7 — Atualizar CLAUDE.md se necessário
