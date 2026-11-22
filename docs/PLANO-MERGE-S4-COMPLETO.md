# Plano de publicação única — branch `feat/s4-convites`

**Supersede** o `docs/PLANO-MERGE-S4a.md` (que cobria só o S4a). Este cobre TUDO que
vai junto numa publicação única. Regras de sempre: migration só ADITIVA, SQL mostrado
antes, **backup de produção verificado antes do merge**, **nada na `main` sem o OK do
JOs** (a `main` faz deploy no Railway e roda `prisma migrate deploy` no build).

> ⚠️ **AGUARDANDO O OK DO JOs PARA PUBLICAR.** Até lá, nada vai para a `main`.

## 1. O que entra (tudo de uma vez)

O branch saiu do `feat/rodada4`, então o merge leva **rodada 4 + S4 inteiro**:

- **Rodada 4 (itens 58–60):** abertura de jogo de verdade (tela-título GBA) no lugar
  do placeholder; remoção do "EN"; service worker que nunca devolve `undefined`.
- **S4a — convites por código:** código **pessoal** por convidado + link `/<slug>/c/<code>`;
  aba Convidados com "Disparar convite" (WhatsApp/Email + marcador de enviado);
  **convites impressos** (lote em branco → PDF A4 com QR + linha de corte); **resgate**
  (pessoal entra como o convidado; em branco cria o convidado + família; já usado →
  passkey); abertura com "Tenho um código" (aceita hífen/espaço/minúsculas) e "Escanear
  QR code". Rate-limit de resgate; auditoria `method="invite_code"`.
- **S4b — escolha de lugar:** no Grande Dia o convidado escolhe uma mesa com lugares
  livres para ele + a família; reserva as cadeiras; a missão guia até a mesa. Aba Mesas
  mostra as cadeiras e permite **travar/mover/liberar**.
- **NPCs do salão:** Fotógrafo→mural, DJ→playlist, Cerimonialista→roteiro, **Garçom**→
  cardápio (pergunta "cardápio ou bebidas?"; bebidas terminam com o aviso de trazer a
  própria bebida). Conteúdo do cardápio em `src/lib/game/cardapio.ts` (exemplo; **sem
  painel, sem migration** — decisão do JOs).
- **Crianças / bebê de colo:** cadastro do acompanhante com "bebê de colo (não ocupa
  cadeira)"; criança ganha cadeira, bebê de colo não; painéis mostram quem é cada um.
- **S4c — família andando junto:** acompanhantes seguem em fila (estilo Pokémon) no
  mapa-múndi e nas 3 fases; criança em tamanho de criança; bebê de colo é carregado.

**Tudo gated no Modo Gamificado** (`Event.experienceType = GAMIFIED`). Evento CLASSIC
não vê nada novo (a aba Convidados mantém o link de WhatsApp simples; sem códigos).

## 2. Migrations (3, todas ADITIVAS) — SQL exato do `migrate deploy`

Nenhuma altera ou remove coluna/tabela existente. Só criam coisas novas. Já aplicadas
**só no voem-dev**; client regenerado; `tsc` 0 · `eslint` 0 erros.

### 2.1 `20261121184553_add_invite_codes`

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
CREATE INDEX "InviteCode_eventId_kind_idx" ON "InviteCode"("eventId", "kind");
CREATE INDEX "InviteCode_guestId_idx" ON "InviteCode"("guestId");
CREATE UNIQUE INDEX "InviteCode_eventId_code_key" ON "InviteCode"("eventId", "code");
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_guestId_fkey"
  FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### 2.2 `20261122012257_add_seats`

```sql
-- CreateTable
CREATE TABLE "Seat" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "seatIndex" INTEGER NOT NULL,
    "guestId" TEXT,
    "companionId" TEXT,
    "claimedById" TEXT,
    "holderName" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'guest',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Seat_eventId_idx" ON "Seat"("eventId");
CREATE INDEX "Seat_tableId_idx" ON "Seat"("tableId");
CREATE INDEX "Seat_claimedById_idx" ON "Seat"("claimedById");
CREATE UNIQUE INDEX "Seat_tableId_seatIndex_key" ON "Seat"("tableId", "seatIndex");
CREATE UNIQUE INDEX "Seat_guestId_key" ON "Seat"("guestId");
CREATE UNIQUE INDEX "Seat_companionId_key" ON "Seat"("companionId");
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_tableId_fkey"
  FOREIGN KEY ("tableId") REFERENCES "SeatingTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_guestId_fkey"
  FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_companionId_fkey"
  FOREIGN KEY ("companionId") REFERENCES "GuestCompanion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### 2.3 `20261122015845_add_companion_lap_infant`

```sql
-- AlterTable (só ADD COLUMN com default — nada quebra)
ALTER TABLE "GuestCompanion" ADD COLUMN "lapInfant" BOOLEAN NOT NULL DEFAULT false;
```

## 3. Backfill dos códigos pessoais (convidados que JÁ existem)

O JOs cadastra convidados reais em produção AGORA. O deploy precisa gerar o código
pessoal de **todos** eles, não só dos novos. Dois caminhos (idempotentes, cobrem 100%):

- **Rede de segurança (automática):** ao abrir a aba **Convidados** de um evento
  GAMIFIED, `ensurePersonalCodes(eventId)` cria o código que faltar. No 1º acesso do
  JOs ao painel após o deploy, todo convidado já ganha código.
- **No deploy (recomendado), rodar UMA vez:** `node scripts/invite/backfill-personal-codes.mjs`
  (no Railway `DATABASE_URL` já está no ambiente). Percorre os eventos GAMIFIED e cria o
  código pessoal de quem não tem. Idempotente.

**Garantias:** nenhum convidado existente fica sem código, e **NADA do que ele já tem é
tocado** — `Guest.sessionToken` (cookie), o link `?k=` e passkeys continuam valendo. O
código pessoal é um registro NOVO (`InviteCode`), separado. Resgatar o código pessoal só
RELÊ o `sessionToken` do convidado para o cookie (não muda o token).

## 4. O que NÃO entra / confirmações

- **Sem** painel de Cardápio e **sem** migration de cardápio (o Garçom lê de
  `src/lib/game/cardapio.ts`). Cardápio é de EXEMPLO — o JOs manda o real e é só editar.
- A migration removida `add_event_menu` foi apagada do branch e do voem-dev (não existe).

## 5. Riscos / rollback

- **Risco baixo:** tudo gated em GAMIFIED; migrations puramente aditivas; nenhuma coluna
  existente muda. Evento CLASSIC intacto.
- **Rollback do código:** `git revert -m 1 <merge>` (ou reverter para o commit anterior
  ao merge). As tabelas novas podem ficar (não atrapalham). Se quiser remover:
  `DROP TABLE "Seat"; DROP TABLE "InviteCode"; DROP TYPE "InviteCodeKind";
  ALTER TABLE "GuestCompanion" DROP COLUMN "lapInfant";` — só se ninguém tiver resgatado/
  escolhido lugar (senão há vínculos por FK SET NULL que você perde).

## 6. Checklist antes do merge (quando o JOs aprovar)

- [ ] `tsc` 0 · `eslint` 0 erros (vitest não roda no WSL — rodar no Windows se quiser)
- [ ] **Backup de produção verificado** ([[backup-producao]] — `~/casamento-backups`)
- [ ] SQL das 3 migrations acima revisado pelo JOs
- [ ] Merge `feat/s4-convites` → `main` (`--no-ff`); deploy do Railway roda
      `prisma migrate deploy` (aplica as 3 migrations na ordem)
- [ ] **Após o deploy:** rodar `node scripts/invite/backfill-personal-codes.mjs` em produção
- [ ] Conferir: site CLASSIC íntegro; 1 convite real disparado (WhatsApp/Email); entrar no
      jogo, escolher lugar, falar com um NPC; a família aparece na fila
- [ ] Limpar dados de teste dev-only? (são só no voem-dev, não vão para produção)

## 7. Dados de teste (dev-only, NÃO vão para produção)

Tudo no voem-dev/demo: família "Paulo Família Teste" (+Marina/Nina/Téo bebê de colo);
Amanda com Bruno/Lili/Bebê Cardoso e reserva na Mesa 3; telefone fake da Amanda; senha do
admin demo = `demo1234`. Nada disso existe no evento real `joseeleticia` em produção.
