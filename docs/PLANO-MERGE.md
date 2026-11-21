# Plano de merge — Modo Gamificado (S3) para produção

Branch: **`feat/s3-personagem`** → `main` (produção: `joseeleticia.com`, Railway,
deploy automático da `main`). **NÃO MERGEAR sem aprovação do JOs.**
Última atualização: 2026-11-20.

> Regra de ouro: nada que funciona hoje pode quebrar. Todo o jogo fica atrás de
> `Event.experienceType = GAMIFIED`. Eventos `CLASSIC` (todos os existentes) ficam
> **inalterados**. As migrations são **só aditivas**.

---

## 1. O que vai para produção

Tudo que está em `feat/s3-personagem` e não está na `main` (S3 completo):

- **Criador de personagem** (LPC): corpo, pele, rosto (olhos/sobrancelha/barba/
  óculos), cabelos, roupas; noiva/noivo para organizadores.
- **Jogo ponta-a-ponta**: mapa-múndi (SMW) + 3 fases (Vila, Bosque, Grande Dia)
  com arte real, câmera, colisões, profundidade (overlays), missões, progresso.
- **Identidade do jogo**: visitante, claim de boneco, passkey — já em parte na main
  (ver migrations); S3 adiciona o personagem e os papéis.
- **Painel dos noivos**: seção **"Recados do jogo"** em *Acessos ao jogo* (avatar
  real do visitante, texto sem emoji).
- **Refino de colisões** das 3 fases (mesas/pedestais sólidos, água, bordas).

Tudo gated por `experienceType`. Convidado de evento **CLASSIC** → site clássico,
**sem nenhuma mudança**. Só evento **GAMIFIED** vê o jogo.

Validação local (WSL): `tsc` 0 erros, `eslint` limpo, **build de produção compila**
(`pnpm build:local` em 2026-11-20). Fluxos conferidos por screenshot (visitante e
organizador, 390 e 1280) em `docs/screens-jogo/`.

---

## 2. Migrations (exatas, nesta ordem)

A `main` **já tem** (não reaplicar): `add_experience_type`, `add_game_identity`,
`add_guest_identification_log`, `add_game_skin`.

Este merge adiciona **4 migrations, todas aditivas** (aplicadas pelo
`prisma migrate deploy` no build do Railway). **Nenhuma** altera ou remove coluna/
dado existente: criam 3 tabelas novas e colunas nullable nelas.

### 2.1 `20261118233513_add_game_character_roles`
Cria as tabelas **GameCharacter**, **EventRole**, **GuestRoleClaim** + índices +
FKs (para `Guest`, `GuestCompanion`, `Event` — todas `ON DELETE CASCADE`).
```sql
CREATE TABLE "GameCharacter" ( "id" TEXT NOT NULL, "guestId" TEXT, "companionId" TEXT,
  "skinColor" TEXT NOT NULL, "hairStyle" TEXT NOT NULL, "hairColor" TEXT NOT NULL,
  "outfit" TEXT NOT NULL, "isChild" BOOLEAN NOT NULL DEFAULT false,
  "lockedByRoleId" TEXT, "randomSeed" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameCharacter_pkey" PRIMARY KEY ("id") );
CREATE TABLE "EventRole" ( "id" TEXT NOT NULL, "eventId" TEXT NOT NULL, "key" TEXT NOT NULL,
  "label" TEXT NOT NULL, "code" TEXT NOT NULL, "uniformSpec" JSONB NOT NULL, "message" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventRole_pkey" PRIMARY KEY ("id") );
CREATE TABLE "GuestRoleClaim" ( "id" TEXT NOT NULL, "guestId" TEXT NOT NULL, "roleId" TEXT NOT NULL,
  "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuestRoleClaim_pkey" PRIMARY KEY ("id") );
CREATE UNIQUE INDEX "GameCharacter_guestId_key" ON "GameCharacter"("guestId");
CREATE UNIQUE INDEX "GameCharacter_companionId_key" ON "GameCharacter"("companionId");
CREATE UNIQUE INDEX "EventRole_eventId_key_key" ON "EventRole"("eventId", "key");
CREATE INDEX "GuestRoleClaim_roleId_idx" ON "GuestRoleClaim"("roleId");
CREATE UNIQUE INDEX "GuestRoleClaim_guestId_roleId_key" ON "GuestRoleClaim"("guestId", "roleId");
ALTER TABLE "GameCharacter" ADD CONSTRAINT "GameCharacter_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameCharacter" ADD CONSTRAINT "GameCharacter_companionId_fkey" FOREIGN KEY ("companionId") REFERENCES "GuestCompanion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRole" ADD CONSTRAINT "EventRole_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestRoleClaim" ADD CONSTRAINT "GuestRoleClaim_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestRoleClaim" ADD CONSTRAINT "GuestRoleClaim_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "EventRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### 2.2 `20261118234000_add_locked_role_fk`
Índice + FK de `GameCharacter.lockedByRoleId` → `EventRole` (`ON DELETE SET NULL`).
```sql
CREATE INDEX "GameCharacter_lockedByRoleId_idx" ON "GameCharacter"("lockedByRoleId");
ALTER TABLE "GameCharacter" ADD CONSTRAINT "GameCharacter_lockedByRoleId_fkey" FOREIGN KEY ("lockedByRoleId") REFERENCES "EventRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### 2.3 `20261119120000_add_character_appearance`
```sql
ALTER TABLE "GameCharacter" ADD COLUMN "appearance" JSONB;
```

### 2.4 `20261119140000_add_game_progress`
```sql
ALTER TABLE "GameCharacter" ADD COLUMN "gameProgress" JSONB;
```

> Todas já aplicadas no **voem-dev** (dev). Em produção serão aplicadas no
> `migrate deploy` do build do deploy da `main`.

---

## 3. Riscos

- **Baixo.** As 4 migrations criam tabelas novas e colunas nullable nelas — não
  tocam em `Guest`, `Event`, fotos, RSVP, nada existente. Eventos CLASSIC seguem
  idênticos (jogo gated por `experienceType`).
- **Peso de assets no 1º acesso do jogo** (mobile): ver `docs/RELATORIO-RODADA3.md`
  (perf 4G). Não afeta quem não abre o jogo.
- **Instabilidade observada no proxy do Postgres voem-dev** (Railway) durante os
  testes: é do ambiente DEV; a produção usa outro banco. Mencionado só por registro.
- **Estado da migration em produção:** antes do merge, confirmar com
  `prisma migrate status` apontando para a produção que as 4 estão *pending* (e
  que as anteriores já estão aplicadas), para o `migrate deploy` ser limpo.

---

## 4. Rollback

1. **Reverter o merge** na `main` (`git revert -m 1 <commit do merge>`) e deixar o
   Railway redeployar. O código do jogo some; CLASSIC nunca foi afetado.
2. **As tabelas novas podem ficar** (vazias/sem uso — não quebram nada). Se quiser
   removê-las de fato (opcional, só depois de confirmar que nenhum evento GAMIFIED
   em produção depende delas):
   ```sql
   DROP TABLE IF EXISTS "GuestRoleClaim";
   DROP TABLE IF EXISTS "GameCharacter";
   DROP TABLE IF EXISTS "EventRole";
   ```
3. **Backup**: ter o `pg_dump` verificado de antes do deploy (cron 03:30 +
   restore-test; a senha GPG é a chave). Em caso extremo, restaurar o dump.

---

## 5. Roteiro de teste em produção (pós-deploy, antes de divulgar)

1. **Smoke CLASSIC (não-regressão):** abrir um convite de evento CLASSIC real e
   confirmar que o site clássico está igual (RSVP, fotos, mural). Nada mudou.
2. **Criar/usar um evento GAMIFIED de teste** (ou marcar um evento de teste como
   GAMIFIED em Configurações → Experiência do convite).
3. **Fluxo do visitante:** `/<slug>/jogo` → "Entrar como visitante" → criar
   personagem → **Salvar** → "Entrar no jogo" → mapa-múndi.
4. **3 fases:** Vila (deixar um recado), Bosque (ver as memórias), Grande Dia
   (encontrar a mesa). Conferir colisões (não atravessa casas/água/mesas) e que o
   boneco não fica preso.
5. **Painel dos noivos:** *Acessos ao jogo* → **Recados do jogo**: o recado do
   passo 3 aparece com o avatar certo, sem emoji.
6. **Mobile real (4G):** repetir 3–4 num celular na rede móvel; confirmar que o
   jogo carrega em tempo aceitável (ver número em `RELATORIO-RODADA3.md`).
7. **Organizador:** logar no painel e jogar (tudo liberado, modo de teste).

---

## 6. Checklist pré-merge (marcar antes de apertar o botão)

- [ ] Aprovação explícita do JOs.
- [ ] `tsc` 0 erros + `eslint` limpo + `pnpm test` (vitest, no Windows) verdes.
- [ ] `prisma migrate status` contra produção: 4 migrations *pending*, resto aplicado.
- [ ] Backup de produção **verificado** (restore-test ok) do dia.
- [ ] Deploy em horário de baixo tráfego; acompanhar o build/deploy do Railway.
- [ ] Rodar o roteiro da seção 5 logo após o deploy.
