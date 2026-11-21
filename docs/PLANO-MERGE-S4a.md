# Plano de merge — S4a (Convites por código: pessoal + impresso)

Branch `feat/s4-convites` (a partir de `feat/rodada4`). **Nada na `main` sem o OK
do JOs.** Regras de sempre: migration só ADITIVA, SQL mostrado antes, backup de
produção verificado antes do merge.

## 1. Migration (ADITIVA) — `20261121184553_add_invite_codes`

SQL exato que o `prisma migrate deploy` roda no build de produção:

```sql
-- CreateEnum
CREATE TYPE "InviteCodeKind" AS ENUM ('PERSONAL', 'BLANK');

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "InviteCodeKind" NOT NULL DEFAULT 'PERSONAL',
    "guestId" TEXT,
    "maxCompanions" INTEGER NOT NULL DEFAULT 4,
    "batchLabel" TEXT,
    "sentAt" TIMESTAMP(3),
    "sentChannel" TEXT,
    "claimedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InviteCode_eventId_kind_idx" ON "InviteCode"("eventId", "kind");
CREATE INDEX "InviteCode_guestId_idx" ON "InviteCode"("guestId");
CREATE UNIQUE INDEX "InviteCode_eventId_code_key" ON "InviteCode"("eventId", "code");

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_guestId_fkey"
  FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

**Só cria** 1 enum + 1 tabela + índices + FKs. **NÃO altera** nenhuma coluna/tabela
existente. Zero risco para o site clássico e para o jogo atual. Já aplicada só no
voem-dev (`migrate deploy`), client regenerado, `tsc`/`eslint` verdes.

## 2. Backfill dos códigos pessoais (convidados que JÁ existem)

O JOs está cadastrando convidados reais em produção AGORA. O deploy precisa gerar
o código pessoal de TODOS eles, não só dos novos. Como é feito:

- **Rede de segurança (automática):** ao abrir a aba **Convidados** de um evento
  GAMIFIED, o `ensurePersonalCodes(eventId)` roda e cria o código que faltar
  (idempotente). Ou seja, no 1º acesso do JOs ao painel após o deploy, todo
  convidado já ganha código.
- **Garantia no deploy (recomendado):** rodar UMA vez, logo após o deploy, o script
  **`scripts/invite/backfill-personal-codes.mjs`** — percorre todos os eventos
  GAMIFIED e cria o código pessoal de quem não tem. Idempotente (pode rodar de novo
  sem duplicar). No Railway: `node scripts/invite/backfill-personal-codes.mjs`
  (DATABASE_URL já está no ambiente).

**Garantias:**
- Nenhum convidado existente fica sem código (os dois caminhos acima cobrem).
- **NADA do que o convidado já tem é tocado:** o código pessoal é um registro NOVO
  (`InviteCode`), separado. `Guest.sessionToken` (cookie), o link `?k=`
  (`Event.publicTokenK`) e qualquer passkey continuam valendo. Resgatar um código
  pessoal apenas RELÊ o `sessionToken` do convidado para o cookie — não muda o token.

Prova no dev: backfill rodou e criou 31 códigos para os 31 convidados do `demo`
(`[demo] convidados=31 tinham=0 criados=31`); rodar de novo cria 0.

## 3. O que entra (S4a)

- **Código pessoal** por convidado (8 chars base32 sem 0/O/1/I) + link `/<slug>/c/<code>`.
- **Aba Convidados:** "Disparar convite" por convidado — WhatsApp (wa.me com a
  mensagem pronta) + Email (pelo sistema do site) + marcador "Enviado em <data> por
  <canal>" e reconfirmação ao reenviar. Sempre manual, 1 a 1.
- **Convites impressos** (`/admin/eventos/[id]/convites`): gerar lote de N códigos
  EM BRANCO → PDF A4 (QR + código + linha de corte); lista livre/usado/por-quem/
  quando; invalidar; gerar mais.
- **Resgate `/<slug>/c/<code>`:** pessoal → entra como o convidado; em branco →
  cria o convidado na lista + família (até N, criança com `isChild`) → criador de
  personagem; já usado → "já usado por <Nome>, é você?" + passkey.
- **Abertura:** "Tenho um código" (pessoal OU em branco) e "Escanear QR code"
  (BarcodeDetector + fallback jsQR em `/vendor/jsqr.js`). `INVITE_CODES_ENABLED=true`.
- Rate-limit de resgate (perfil `redeem`). Auditoria `method="invite_code"`.
- Fonte `public/fonts/DejaVu*` (pdfkit não acha as fontes AFM padrão no bundler).

**NÃO entra (próximas fases):** escolha de lugar no salão (S4b) e família andando
junto no jogo (S4c).

## 4. Riscos / rollback

- **Risco baixo:** tudo gated no Modo Gamificado; evento CLASSIC não vê nada novo
  (aba Convidados mantém o link WhatsApp simples). Migration puramente aditiva.
- **Rollback:** `git revert -m 1 <merge>`; a tabela `InviteCode` pode ficar (não
  atrapalha). Se quiser remover: `DROP TABLE "InviteCode"; DROP TYPE "InviteCodeKind";`
  (só se ninguém tiver resgatado — senão há `Guest` vinculados por FK SET NULL).

## 5. Checklist antes do merge (quando o JOs aprovar)

- [ ] `tsc` 0 · `eslint` 0 · (`vitest` não roda no WSL)
- [ ] Backup de produção verificado ([[backup-producao]])
- [ ] SQL acima revisado pelo JOs
- [ ] Após deploy: rodar `scripts/invite/backfill-personal-codes.mjs` em produção
- [ ] Conferir o site CLASSIC íntegro + 1 convite real disparado por WhatsApp/Email
