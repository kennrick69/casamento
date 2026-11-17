# Modo Gamificado — Documento de Visão (fonte da verdade)

> **Status:** PASSO 0 — visão aprovada, implementação não iniciada (exceto fix do PRESS START).
> **Branch de trabalho:** `feat/modo-gamificado` (criado a partir de `main`).
> **Texto original da missão:** [`missao-original.md`](./missao-original.md) (verbatim, sem resumo).
> **Última atualização:** 2026-11-17.

---

## 0. Resumo executivo

O Voem. ganha uma **segunda experiência** de convite: um **JOGO web completo** (RPG top-down estilo Pokémon/Stardew Valley) que roda sobre o **mesmo backend** do site atual (convidados, RSVP, presentes, fotos, playlist, pontos, mesas, painel). Não é um tema novo — é um sistema paralelo.

- O site atual vira a experiência **CLÁSSICA** e continua intacta.
- Cada evento escolhe no painel: **CLÁSSICA** ou **GAMIFICADA**.
- Tudo do jogo fica atrás dessa escolha. **Nada que funciona hoje pode quebrar.**

### Regra de ouro (não negociável)
1. A experiência clássica continua existindo e funcionando. Zero regressão.
2. Produção (`joseeleticia.com`) faz deploy a cada push na `main`. Trabalhar em branch; só subir para a `main` o que estiver estável.
3. Todo código do jogo fica atrás do gate `experienceType` do evento.

---

## 1. Contexto técnico atual (o que já existe e vamos reaproveitar)

Stack: **Next.js + Prisma + Postgres (Railway) + Auth.js + React Three Fiber + Sentry**, gerenciador **pnpm**. O script `dev` foi renomeado para `_dev` de propósito — não mexer.

> ⚠️ `AGENTS.md` avisa: **esta versão do Next.js tem breaking changes**. Antes de escrever qualquer código de rota/componente, ler o guia relevante em `node_modules/next/dist/docs/`. Não assumir APIs do Next que você "já conhece".

### Infra de backend já pronta (mapeada no schema)
O schema Prisma já é surpreendentemente "game-ready". A tabela abaixo é a base do reaproveitamento:

| Necessidade do jogo | Já existe no schema | Observação |
|---|---|---|
| Evento + config | `Event` (+ `features` Json, `customization` Json) | Buckets flexíveis para config do jogo |
| Convidado sem senha | `Guest` (`sessionToken`, `inviteToken`, `approved`) | Acesso sem senha já funciona |
| Acompanhantes | `GuestCompanion` + `CompanionType` (ADULT/CHILD) | Criança = boneco menor |
| Pontos / ranking | `GuestPoints`, `PointEvent`, `Mission` | Motor de gincana já existe |
| QR / check-in | `CheckinCode` (`code`, `purpose`, `missionId`, `active`, `validFrom/Until`) + `Checkin` (`lat/lng`) | Base dos QR liga/desliga |
| Mesas | `SeatingTable` + `SeatingAssignment` | Precisa evoluir p/ cadeiras, grupo, reserva, LGPD |
| Editor do salão | `Venue3D` + `Venue3DObject` (kinds: mesas redonda/retangular/imperial, DJ_BOOTH, DANCE_FLOOR, BAR, STAGE, CAKE_TABLE, BUFFET...) + `Venue3DAvatar` | **Já é o editor do salão** — Phaser consome esse layout |
| Padrinhos/madrinhas | `WeddingPartyMember` + `WeddingRole` + `WeddingSide` | Lista estática; papéis-com-código é novo |
| Fases (conteúdo) | `EventLocation`, `JourneyItem`, `CoupleStoryItem`, `Gift`+`Donation`, `Photo`/`GalleryPhoto`, `ChatMessage`/`CoupleMessage`, `PlaylistSuggestion`/`PlaylistVote` | Cada fase é uma nova apresentação dessas features |
| Telão | `LiveEvent` + modo TV existente | Ranking ao vivo |
| LGPD | `DataAccessLog`, consents no `Guest` | Reusar nas telas do jogo |

### Front já pronto
- Rota do convidado: `src/app/(public)/[slug]` — **é aqui que o PRESS START passa a levar**.
- Painel dos noivos: `src/app/(admin)/admin` — continua só para os noivos.
- Abertura "Una o Casal": `src/components/landing/ProtoScene.tsx` — **aprovada, não mexer** (só o handler do botão foi corrigido).
- PWA: `public/manifest.json` já existe (sem service worker / next-pwa ainda — avaliar em S7).

---

## 2. Correção do PRESS START (feita neste branch)

**Bug:** o botão `PRESS START` fazia `router.push('/admin')` e jogava o convidado no login do painel.

**Fix:** agora `handleEnterClick()` leva para a experiência do evento:
```ts
const PRIMARY_EVENT_SLUG =
  process.env.NEXT_PUBLIC_PRIMARY_EVENT_SLUG || 'joseeleticia';
// ...
router.push(`/${PRIMARY_EVENT_SLUG}`);
```
A rota `(public)/[slug]` decide (via `event.experienceType`) entre renderizar a experiência clássica ou o jogo. O painel segue exclusivamente em `/admin`. Em `joseeleticia.com`, a raiz abre o evento do casal.

---

## 3. Arquitetura da experiência

```
Abertura "Una o Casal" (ProtoScene, SEM som)
        │ PRESS START  →  /[slug]
        ▼
  (public)/[slug]  — lê event.experienceType
        ├── CLASSIC   → experiência atual (intacta, temas de cor valem)
        └── GAMIFIED  → <GameExperience/>  (Phaser 3, client, som liga aqui)
                          ├── Tela de título (NOVO JOGO / CONTINUAR / CARREGAR JOGO)
                          ├── Identidade + personagem
                          ├── Mapa de fases (top-down)
                          ├── Fases (cenários com NPC)
                          └── Salão de festas (sempre aberto)
```

- **Gate:** `experienceType` no `Event`. Default `CLASSIC` para todo evento existente (garante zero regressão).
- **Motor:** Phaser 3 em componente client com **import dinâmico** (`ssr: false`), carregado só quando `experienceType === 'GAMIFIED'`. O bundle do Phaser nunca entra na experiência clássica.
- **Dados:** o jogo é **camada de apresentação** — consome as APIs/server actions já existentes. Nenhuma regra de negócio é reescrita no cliente.
- **Mobile-first:** cenas carregadas sob demanda, texture atlases, áudio lazy. Alvo: celular.

---

## 4. Fluxo do convidado

### 4.1 Entrada sem senha
- Link/QR único para todos os convidados.
- **NOVO JOGO:** nome + celular → busca na lista (`Guest`) → "Você é a Marta Doerner?".
- Após o cadastro: criar **passkey (WebAuthn)** via SimpleWebAuthn (digital/Face ID). Próximas visitas: PRESS START → CONTINUAR → biometria → carrega o save. Fica no chaveiro do aparelho (sincroniza com Google/iCloud), não depende de cache.
- **Plano B — CARREGAR JOGO:** digita o celular → recebe código por WhatsApp ou e-mail (reusa o acesso sem senha já existente: `sessionToken`/`inviteToken`).
- **Proibido:** IP, IMEI, MAC, fingerprint de aparelho.

### 4.2 Acompanhantes
- Cadastro pergunta "Vai levar acompanhante?" → quantos (até o limite do convite, config no painel) → por acompanhante: nome + adulto/criança (`GuestCompanion`/`CompanionType`). Criança = boneco menor.
- O grupo anda em fila (estilo Pokémon).
- Se o acompanhante abrir o link e se cadastrar com o próprio celular: "A Ana já incluiu você no grupo. É você?" → assume o próprio boneco, **sem duplicar** (claim de companion → promove a `Guest` próprio vinculado ao grupo).

### 4.3 Visitantes (fora da lista)
- Chave no painel: **permitir visitantes** sim/não.
- Visitante **pode:** Nossa história, Galeria, Correio, Presentes/Fonte dos desejos.
- Visitante **não pode:** confirmar presença, escolher mesa, ver local/horário/salão.
- Botão "Pedir para ser convidado" → pedido no painel → noivos aprovam/recusam. Aprovado vira convidado e libera tudo. (Reusa `Guest.approved` + `Event.guestApprovalRequired`.)

### 4.4 Criação do personagem (paper-doll por camadas)
- **Convidados (simples, < 1 min):** cabelo curto/comprido, cor do cabelo, cor da pele, traje. Botão aleatório.
- **Noivos (completa):** vários tipos de cabelo (liso, ondulado, cacheado, coque...), muitas cores, roupas exclusivas.
- **BRANCO é exclusivo da noiva.** Nenhum convidado escolhe roupa branca (validação no servidor).
- Sprites montáveis por camadas: corpo/pele + cabelo + roupa.
- **Arte (decisão tomada):** pacote **LPC** fornecido pelo JOs em `assets-src/personagens/lpc/` (não procurar/baixar outros). Camadas paper-doll 64×64 com animações walk/idle/sit/emote/run/jump. Os `sheet_definitions/` + `palette_definitions/` (JSON do gerador oficial) definem camadas, ordem (z) e cores — **base direta do criador em camadas (S3)**. Peças de casamento já disponíveis: smoking (`torso_jacket_frock` + `vest` + `longsleeve_formal` + `legs_formal` + `neck_bowtie` + `hat_formal_tophat`), vestido/gown (`dress_bodice` + `legs_skirt_belle` + `hat_formal_tiara`), sapato social (`feet_shoes_*`), corpo de criança (boneco menor). Licenças/créditos em [`../ASSETS-LICENSES.md`](../ASSETS-LICENSES.md) — exige **tela de Créditos** no jogo.

### 4.5 Papéis especiais com código (sistema GENÉRICO)
- No cadastro do personagem: "Sou madrinha" / "Sou padrinho" → pede **código**.
- Códigos definidos pelos noivos no painel (podem ser trocados).
- Código correto **libera e TRAVA** o uniforme (cor/estilo definidos pelos noivos) e mostra a mensagem escrita por eles (ex.: "Madrinha, vestido verde-oliva, longo...").
- Começa com madrinha/padrinho, mas o modelo é **genérico**: noivos poderão criar outros papéis (pajem, daminha, pais...), cada um com código + uniforme + mensagem.

---

## 5. Mapa de fases (estilo Super Mario World)

Visão de cima, caminhos ligando pontos. Toca no ponto → grupo caminha → ENTRAR/SEGUIR. **Recepção (RSVP) é obrigatória e primeira**; depois dela todas liberam. Seta/brilho indica o caminho sugerido; fase concluída ganha bandeirinha; completar todas dá bônus (moedas/estrela).

| # | Fase | Feature reaproveitada | Condição |
|---|---|---|---|
| 1 | Recepção (confirmar presença) | RSVP (`Guest.rsvpStatus`) | **Obrigatória, primeira** |
| 2 | Nossa história | `CoupleStoryItem` | |
| 3 | O grande dia (local/horário/traje/como chegar) | `EventLocation`, `JourneyItem`, `Event` | só convidado |
| 4 | Correio (mensagem ao casal) | `CoupleMessage` | |
| 5 | Loja de presentes | `Gift` | |
| 6 | Fonte dos desejos (secreta, moeda dourada na bifurcação) | `Donation` (Pix/Mercado Pago) | dá pontos |
| 7 | Galeria (mural de fotos) | `Photo`/`GalleryPhoto` | |
| 8 | Quiz do casal | `Mission`/gincana | |
| 9 | Igrejinha no morro | `EventLocation` (CEREMONY) | **só se "cerimônia na igreja" ligado** (JOs não tem) |
| 10 | Salão de festas | ver §6 | sempre aberto |

### Dentro das fases
Perspectiva RPG Maker / Pokémon GBA, mas **pixel art de alta definição** (nível Stardew Valley). Cada fase é um cenário pequeno com NPC e caixa de diálogo clássica. A funcionalidade é a do backend; o jogo só muda a apresentação.

---

## 6. Salão de festas (sempre aberto)

Cenário grande, câmera segue o personagem (estilo Game Boy). Elementos:

- **DJ** (luzes piscando): mostra e deixa sugerir músicas (`PlaylistSuggestion`/`PlaylistVote`).
- **Cerimonialista:** número de confirmados (ex. "62 de 80"), horário de início e infos escritas pelos noivos. **Nunca mostra nomes.**
- **Garçom:** cardápio de bebidas/comidas (config painel) + se pode levar a própria bebida.
- **Fotógrafo:** fotos já enviadas (mesma galeria) + envio dali.
- **Mesa dos noivos** em destaque.
- **Mesas reais com cadeiras:**
  - Mostra cadeiras ocupadas com o **primeiro nome** (ex. "Mesa 7 — Melo, Trida, Duda + 3 livres").
  - "Sentar aqui" → grupo ocupa cadeiras lado a lado. Se não couber: aviso + procurar outra mesa ou dividir o grupo.
  - Mesas reservadas pelos noivos: "Reservada", sem nomes.
  - Checkbox no cadastro (já marcado): "Mostrar meu primeiro nome na mesa". Quem desmarca aparece como "Convidado". **Nunca nome completo/CPF (LGPD).**
  - Troca de mesa livre enquanto houver lugar, até o prazo configurável (padrão 10 dias antes).
  - Painel: "Confirmar escolha de mesa automaticamente sim/não" → se não, escolha fica pendente até aprovação.
- **Bonecos vivos:** quem confirmou fica sentado na mesa escolhida. Só 6–10 (config) andam ao mesmo tempo, revezando (pista, garçom, fotógrafo, DJ). Sem nome (ou só primeiro nome autorizado).

### Editor do salão (painel) — evoluir o que já existe
O **`Venue3D`/`Venue3DObject` já é o editor do salão**: número de mesas, estilo (redonda/retangular/imperial via `Venue3DObjectKind`), capacidade (`seats`), posição (`posX/posZ/rotation`), além de pista, DJ, bar, palco, mesa do bolo. **Decisão:** o layout do `Venue3D` é a **fonte canônica** — o Phaser renderiza esse mesmo layout em 2D top-down. Evoluir o drag-and-drop existente (`SeatingTable`/Sala 3D) em vez de criar um editor paralelo. O que os noivos montam é exatamente o salão que o convidado vê.

---

## 7. Pontos, ranking, prêmios, QR codes

- Fases, doação, fotos, check-ins e missões dão moedas/pontos → integrar com `PointEvent`/`GuestPoints`/`Mission`.
- **Ranking** entre convidados. Prêmios configuráveis por posição (quantas posições + texto de cada). Padrão: 1º espumante + dança com os noivos; 2º primeiro pedaço do bolo; 3º kit de doces.
- Ranking ao vivo no **telão** (modo TV + `LiveEvent`) e anúncio dos premiados.
- **QR codes** (dia do casamento):
  - Entrada da festa: check-in + pontos.
  - Igreja (se habilitada): pontos próprios.
  - Foto/missão espalhados (mesas): abrem direto o upload pedido (ex. foto com os noivos) → pontos + aparecem no fotógrafo/galeria.
  - **Cada QR liga/desliga individualmente + pontos próprios** (reusa `CheckinCode.active` + pontos). Deixar bem amplo e flexível.

---

## 8. Extras

- **Visor retro** no topo (painel de nave estilo Star Wars, dígitos LED): "FALTAM N DIAS" / "É HOJE!".
- **Som:** uma música por parte (título, mapa, cada fase, salão) + efeitos 8-bit (passos, moeda, porta, diálogo) + **botão de mudo sempre visível**. A abertura Una o Casal continua **sem som**; o som começa no PRESS START.
- **Lembretes:** e-mail já existe (7 e 1 dia antes); acrescentar lembretes configuráveis (ex. "escolha sua mesa até tal dia"). WhatsApp automático como opção no painel (avaliar custo da API oficial e **documentar** antes de implementar) + botão manual de WhatsApp que já existe.
- **Capacidade total** do evento no painel (hoje não existe). Ao lotar, a confirmação avisa.

---

## 9. Modelo de dados proposto

> **Importante:** proposta sujeita a ajuste em S1 após `prisma generate` e reconciliação com os nomes reais. **Nenhuma migration roda até combinarmos um banco de desenvolvimento separado** (ver §12). Config simples pode começar em `Event.features`/`customization` (Json) e virar coluna quando estabilizar.

### 9.1 Gate e configuração do evento
```prisma
enum ExperienceType { CLASSIC GAMIFIED }

// no model Event (novos campos):
experienceType        ExperienceType @default(CLASSIC)   // default garante zero regressão
allowVisitors         Boolean        @default(false)
maxCapacity           Int?                                // capacidade total; null = sem limite
companionLimitPerInvite Int          @default(0)
churchCeremony        Boolean        @default(false)      // liga a fase Igrejinha
walkingAvatarsLimit   Int            @default(8)          // 6–10 bonecos andando
tableChangeDeadline   DateTime?                            // padrão: 10 dias antes
autoConfirmTable      Boolean        @default(true)
canBringOwnDrink      Boolean        @default(false)
// infos do cerimonialista, cardápio do garçom, prêmios e lembretes:
// começam em `customization` (Json) e migram p/ colunas/tabelas se crescerem.
```

### 9.2 Passkey (WebAuthn)
```prisma
model GuestCredential {
  id            String   @id @default(cuid())
  guestId       String
  credentialId  String   @unique          // base64url
  publicKey     Bytes
  counter       BigInt   @default(0)
  transports    String?                    // csv
  deviceLabel   String?
  createdAt     DateTime @default(now())
  lastUsedAt    DateTime?
  guest         Guest    @relation(fields: [guestId], references: [id], onDelete: Cascade)
  @@index([guestId])
}
```

### 9.3 Personagem (paper-doll)
```prisma
// Polimórfico: o dono é um Guest OU um GuestCompanion (grupo anda junto).
model GameCharacter {
  id          String   @id @default(cuid())
  guestId     String?  @unique
  companionId String?  @unique
  skinColor   String
  hairStyle   String
  hairColor   String
  outfit      String                        // branco bloqueado p/ não-noiva (validação server)
  isChild     Boolean  @default(false)       // boneco menor
  lockedByRoleId String?                      // uniforme travado por papel
  randomSeed  Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```
> Reconciliar com `Venue3DAvatar`/`AvatarSource` (voxel 3D): são coisas distintas (3D voxel vs 2D paper-doll). Decidir em S3 se convergem ou coexistem.

### 9.4 Papéis com código (genérico)
```prisma
model EventRole {
  id          String   @id @default(cuid())
  eventId     String
  key         String                         // "madrinha", "padrinho", "pajem"...
  label       String
  code        String                         // definido/trocável pelos noivos
  uniformSpec Json                           // cor, peça, estilo travados
  message     String   @db.Text              // mensagem exibida ao reivindicar
  active      Boolean  @default(true)
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  claims      GuestRoleClaim[]
  @@unique([eventId, key])
}
model GuestRoleClaim {
  id        String   @id @default(cuid())
  guestId   String
  roleId    String
  claimedAt DateTime @default(now())
  @@unique([guestId, roleId])
}
```
> Migrar os dados de `WeddingPartyMember` para esse modelo é opcional; podem coexistir (lista de exibição vs papel reivindicável com código).

### 9.5 Progresso de fase (para o mapa)
```prisma
enum PhaseStatus { LOCKED AVAILABLE COMPLETED }
model GuestPhaseProgress {
  id          String      @id @default(cuid())
  guestId     String
  phaseKey    String                          // "reception", "story", "gifts"...
  status      PhaseStatus @default(LOCKED)
  completedAt DateTime?
  @@unique([guestId, phaseKey])
}
```

### 9.6 Seleção de mesa no jogo (evolução de Seating)
Evoluir `SeatingAssignment` (hoje: `guestId @unique` → 1 convidado/mesa) para seleção pelo convidado, cadeira a cadeira, com grupo, reserva, LGPD e prazo. Proposta:
```prisma
// Guest: + showNameOnTable Boolean @default(true)   (LGPD opt-in)
// SeatingTable: + reserved Boolean @default(false), + style String, + posX/posZ (ou derivar de Venue3DObject)
enum SeatSelectionStatus { PENDING CONFIRMED }
model SeatSelection {
  id          String @id @default(cuid())
  tableId     String
  guestId     String?
  companionId String?
  seatIndex   Int
  status      SeatSelectionStatus @default(CONFIRMED)  // PENDING se autoConfirmTable=false
  createdAt   DateTime @default(now())
  @@unique([tableId, seatIndex])
}
```
> Fonte canônica do layout = `Venue3D`/`Venue3DObject`. `SeatSelection` referencia a mesa; os bonecos vivos leem daqui quem está sentado.

### 9.7 QR codes flexíveis
```prisma
// CheckinCode: + points Int @default(0), + kind String ("entry"|"church"|"photo"|"mission")
// Mantém active (liga/desliga) e validFrom/validUntil. QR de foto aponta p/ uma Mission de upload.
```

### 9.8 Prêmios e lembretes
```prisma
model EventPrize {
  id          String @id @default(cuid())
  eventId     String
  position    Int
  description String
  @@unique([eventId, position])
}
enum ReminderChannel { EMAIL WHATSAPP }
model EventReminder {
  id          String   @id @default(cuid())
  eventId     String
  key         String                         // "rsvp", "choose-table"...
  channel     ReminderChannel @default(EMAIL)
  offsetDays  Int                             // dias antes da cerimônia
  message     String   @db.Text
  enabled     Boolean  @default(true)
  @@unique([eventId, key, channel])
}
```

---

## 10. Decisões técnicas

1. **Gate por `experienceType`** no `Event`, default `CLASSIC`. Eventos existentes não mudam de comportamento. O jogo só carrega quando `GAMIFIED`.
2. **Phaser 3** em componente client com **import dinâmico (`ssr: false`)**, isolado em `src/components/game/`. Nunca entra no bundle da experiência clássica. **Antes de codar rota/componente, ler `node_modules/next/dist/docs/`** (AGENTS.md: breaking changes).
3. **WebAuthn via SimpleWebAuthn** (`@simplewebauthn/server` + `@simplewebauthn/browser`). Credenciais em `GuestCredential`. RP ID = domínio do evento. Fallback = fluxo sem senha já existente (celular → código por WhatsApp/e-mail). Nada de IP/IMEI/MAC/fingerprint.
4. **Jogo = camada de apresentação.** Consome APIs/server actions existentes; regras de negócio não são reescritas no cliente. Validações sensíveis (branco só p/ noiva, código de papel, LGPD) **no servidor**.
5. **Salão:** `Venue3D` é a fonte canônica do layout; Phaser renderiza em 2D. Evoluir o editor existente, não duplicar.
6. **Pontos/QR:** reusar `PointEvent`/`GuestPoints`/`Mission`/`CheckinCode`. Cada QR com `active` + `points`.
7. **LGPD:** só primeiro nome e só com opt-in (`showNameOnTable`); nunca nome completo/CPF. Reusar `DataAccessLog`.
8. **Arte dos personagens (decisão tomada): pacote LPC** em `assets-src/personagens/lpc/` (fornecido pelo JOs, commit fixado `0414067`). **Não procurar nem baixar outros pacotes de personagens.** `assets-src/` é fonte, fica **fora do git** (`.git/info/exclude`) e **não é commitada**; copiar/processar para `public/` **só** os arquivos que o jogo usar. O criador de camadas (S3) é dirigido pelos `sheet_definitions/`/`palette_definitions/`. Cada arquivo usado → registrar autores+licença+link em `docs/ASSETS-LICENSES.md` (dados do `CREDITS.csv`) + **tela de Créditos** obrigatória (licenças OGA-BY/CC-BY/CC-BY-SA/GPL/CC0 — comerciais, mas exigem crédito; share-alike recai sobre a arte, não sobre o código). Áudio (S7): livre de direitos ou IA com licença comercial, mesmo registro. Peça paga/manual → listar no relatório.
9. **Mobile/PWA:** só web (link/QR, "adicionar à tela inicial"). `manifest.json` já existe; avaliar service worker em S7. Sem loja de apps.
10. **Produção:** tudo atrás do gate; branch `feat/modo-gamificado`; só merge estável na `main`. **Migrations só após banco de dev separado combinado.** O build do Railway roda `prisma migrate deploy` → **toda migration que entra na `main` é aplicada automaticamente na produção**. Por isso as migrations do jogo são **estritamente aditivas** (campos novos com default, tabelas novas); **nunca** renomear/apagar coluna nem nada que quebre o clássico. **Antes de qualquer merge na `main`, mostrar o SQL da migration ao JOs.**

---

## 11. Plano de sprints

| Sprint | Entrega | Reaproveita | Critério "não quebra clássico" |
|---|---|---|---|
| **S0** | Documento de visão + fix PRESS START | — | PRESS START vai p/ `/[slug]`; clássico intacto |
| **S1** | `experienceType` + campos de config do evento (schema + migration) no banco de dev | `Event.features/customization` | Default `CLASSIC`; eventos atuais inalterados |
| **S2** | Identidade: cadastro, passkey (WebAuthn), código por celular, acompanhantes, claim de boneco, visitantes | `Guest`, `GuestCompanion`, acesso sem senha | Rotas do jogo só sob `GAMIFIED` |
| **S3** | Criador de personagem em camadas + papéis com código | LPC `sheet_definitions`/`palette_definitions`; `WeddingPartyMember` (ref) | copiar p/ `public/` só o usado; registrar créditos |
| **S4** | Tela de título + mapa de fases + framework de fase + fase Recepção (RSVP) | RSVP | RSVP clássico continua funcionando |
| **S5** | Demais fases | conteúdo existente de cada feature | — |
| **S6** | Editor do salão (evoluir) + cena do salão com NPCs, mesas e bonecos vivos | `Venue3D`, `SeatingTable` | Plano de mesas clássico intacto |
| **S7** | Pontos, ranking, prêmios, QR codes, telão, som, contador retro, lembretes | `PointEvent`, `CheckinCode`, `LiveEvent`, modo TV, e-mails | Gincana/telão clássicos intactos |

### Obrigatório a cada sprint
- Commits organizados por sprint; nada quebra a experiência clássica.
- Atualizar `docs/STATUS.md` e `RELATORIO-MODO-GAMIFICADO.md` (o que foi feito, como testar com links, screenshots/descrição p/ avaliar pelo celular, decisões, o que precisa do JOs).
- Seguir `_shared/` (autonomia na execução; risco irreversível registrado em `logs/decisoes-criticas.md`).

---

## 12. Pendências / o que preciso do JOs

1. **Banco de desenvolvimento separado (bloqueia S1).** Não existe `.env`/`.env.local` no checkout e as migrations alteram o Postgres de produção do Railway. Preciso de um Postgres de dev (sugestão: segundo Postgres no Railway, ou Neon, ou Docker local) e o `DATABASE_URL` dele antes de qualquer `prisma migrate dev`/`db push`. **Confirmado: não rodo nenhum comando Prisma que altere banco até combinarmos.**
2. **Deploy de branch:** confirmar no painel do Railway se há ambiente de preview/PR ou se só a `main` faz deploy (ver §13).
3. **Peças de personagem:** **véu de noiva criado** por mim como obra derivada do cabelo LPC `xlong` (`assets-src/custom/veil/`, branco translúcido 65%, 6 animações, bg+fg) — aguardando aprovação do preview; registrado em [`../ASSETS-LICENSES.md`](../ASSETS-LICENSES.md) §1.1. **Vestido de noiva dedicado** é opcional (gown componível com `dress_bodice` + `legs_skirt_belle` branco + tiara). Smoking do padrinho e tiara já cobertos. Áudio (músicas/efeitos) a providenciar em S7.
4. **WhatsApp API:** avaliar e documentar o custo da API oficial antes de implementar lembrete automático por WhatsApp.
