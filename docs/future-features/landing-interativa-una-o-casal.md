# Landing Interativa "Una o Casal" — Especificação Técnica MVP

> **Status:** Aprovada pra implementação **antes do casamento do dono**.
> **Pré-requisito:** Bloco A (auth profissional) concluído primeiro.
> **Princípio orientador:** arquitetura do código suporta diversidade total desde o dia 1; assets visuais começam mínimos (só o casal dono) e vão sendo adicionados sem mudança de código.

---

## Conceito narrativo

Na primeira visita à URL pública (raiz `/` da plataforma e/ou `/[slug]` via QR code de convite), o usuário cai numa cena interativa antes de chegar na landing real:

1. Os dois noivos do evento aparecem em queda livre, separados, passando por nuvens
2. Contagem regressiva visível (15 segundos)
3. Instrução clara: **"Una o casal"**
4. Usuário arrasta um dos noivos em direção ao outro, com o dedo no celular
5. Quando as mãos se encontram, eles param de cair, ficam suspensos, e começam a voar **horizontalmente** entre as nuvens em loop
6. Após 1.5-2 segundos do voo iniciar, surge gradualmente um botão centralizado abaixo da cena:
   > **"Você é digno deste convite, clique aqui"**
7. Usuário só sai da animação ao clicar no botão. Click teleporta direto pra landing real (sem transição animada).

**Cena de fail:** se a contagem regressiva zerar sem o usuário unir os noivos, ambos caem na tela escurecendo dramaticamente. Após escurecer, surge a mensagem em tipografia clara:

> **"Eles só serão felizes juntos, faça-os darem as mãos, poxa!"**

Junto com botão **"Tentar de novo"** que reinicia a animação.

A animação **não é pulável mesmo pra usuários recorrentes**. Justificativa: quando convidado mostra o convite pra alguém ao lado, a pessoa nova vê a experiência completa.

---

## Princípio arquitetural fundamental

### Separação clara: capacidade do sistema vs. assets disponíveis

**Capacidade do código (implementada desde o dia 1):**
- Suporta 3 tipos de casal: `HETERO` (1 noivo + 1 noiva), `TWO_BRIDES` (2 noivas), `TWO_GROOMS` (2 noivos)
- Admin do casal escolhe o tipo no wizard de criação do evento
- Sistema de seleção de avatar por personagem
- Renderização da animação adapta posições conforme tipo de casal

**Assets visuais (entregues incrementalmente):**
- MVP inicial: 1 noivo + 1 noiva (representando o casal dono da plataforma)
- Conforme arte vai sendo gerada, sistema absorve sem precisar reescrever código
- Outros tipos de casal mostram fallback gracioso até arte específica estar pronta

**Ganho dessa abordagem:**
- MVP entrega rápido (escopo de arte realista pré-casamento)
- Inclusão futura é só adicionar arquivos, não refatorar código
- Plataforma nunca precisa "fechar a porta" pra LGBTQIA+ — porta sempre aberta arquiteturalmente
- Coerência ética: sistema é inclusivo desde o início, mesmo que a arte demore

---

## Direção de arte

### Referência principal
**Super Mario Galaxy / Super Mario Bros. O Filme (2023)**
- 3D estilizado com volume nos personagens
- Cosmos e cenários vibrantes
- Cores saturadas: roxo, rosa, azul cobalto, dourado
- Personagens com expressões claras, contornos suaves
- Sensação cinematográfica e contemplativa

URL referência: https://www.nintendo.com/pt-br/movies/super-mario-galaxy/

### Personagens — escopo MVP de assets

**Único par que existe no lançamento:**

**Noiva:** representando a noiva do dono. Aparência a ser definida em conversa com a noiva (cor de cabelo, comprimento, traços gerais). Vestido tradicional branco longo.

**Noivo:** representando o dono. Aparência a ser definida (cor de cabelo, presença/ausência de barba, traços gerais). Smoking ou terno tradicional.

**Estados de cada personagem (3 poses cada = 6 imagens totais):**
1. Queda livre (braços levemente abertos, expressão serena)
2. Voo suspenso (mãos dadas, postura tranquila)
3. Caindo no fail (postura acelerada, expressão de "ops")

**Importante:** definição visual dos 2 personagens deve ser feita junto com a noiva. É a primeira coisa que cada convidado vai ver, e durante anos essa imagem fica associada ao casal dono.

### Sistema de seleção de avatar (admin)

No wizard de criação do evento (`/admin/eventos/novo`), o casal escolhe:

1. **Tipo de casal:** Hétero | 2 Noivas | 2 Noivos
2. **Avatar do(s) noivo(s):** lista de avatares disponíveis
3. **Avatar da(s) noiva(s):** lista de avatares disponíveis

Inicialmente, a lista terá apenas 1 noivo e 1 noiva disponíveis (o casal dono). Conforme arte for gerada, novos avatares aparecem na lista automaticamente (sem deploy de código).

**Comportamento quando casal escolhe tipo sem avatar disponível:**
- Mostra mensagem: "Mais avatares em breve. Por enquanto, sua animação usará avatares genéricos."
- Renderiza com placeholder visual digno (silhueta estilizada, não erro)
- Permite que o casal salve o evento mesmo assim
- Quando arte específica chegar, atualiza automaticamente

### Cenário (gerado independente do casal)

**Céu:** pôr do sol fixo
- Paleta: dourado, rosa-coral, laranja, magenta, transição pra roxo no topo
- Nuvens fofas em tons de rosa, laranja claro, branco quente

**Plano de fundo embaixo:** mar
- Horizonte infinito
- Reflexo do pôr do sol no mar
- Ondas tranquilas
- Ilhas distantes (opcional, profundidade)

**Voo horizontal em loop:**
- Câmera segue lateralmente
- Nuvens em paralaxe (3-5 camadas)
- Mar permanece visível distante
- Estrelas começam a aparecer no topo (sutil)

**Cena de fail (escurecimento):**
- Tela escurece progressivamente em ~1 segundo
- Para em escuro com leve gradiente roxo
- Tipografia da mensagem em branco/dourado claro, serif decorativa
- Botão "Tentar de novo" abaixo

---

## Comportamento técnico

### Gameplay
- **Orientação:** apenas vertical (portrait)
- **Direção do gesto:** drag horizontal
- **Velocidade da queda:** lenta, contemplativa (~15 segundos)
- **Velocidade do voo (após unir):** loop de 8 segundos
- **Feedback tátil:** vibração leve no momento das mãos se encontrando (haptic API quando disponível)

### Botão "Você é digno deste convite"
- Aparece 1.5-2 segundos após início do voo (fade-in)
- Centro inferior, abaixo dos noivos
- Pill-shaped, glow dourado, tipografia serif
- Click: teleporta direto pra landing real

### Contagem regressiva
- Topo central, durante toda a queda
- Tipografia grande, monoespaçada, dourada
- Formato simples (`15`, `14`, `13`...)
- Quando zera: dispara cena de fail

### Persistência
- Não memoriza se o usuário já viu
- A cada acesso, anima novamente
- Decisão consciente (permitir compartilhamento)

### Cookies
- Animação puramente client-side
- Após click no botão, fluxo normal de identificação inicia

---

## Áreas onde a animação aparece

**Aparece em:**
1. Raiz da plataforma (`/`) — antes da página institucional
2. Landing pública de qualquer evento (`/[slug]`) — antes da landing do casamento

**Não aparece em:**
- Rotas de admin (`/admin/*`)
- Rotas legais (`/privacidade`, `/termos`)
- Rotas de auth (`/login`, `/signup`, etc)
- Rotas internas de convidado já identificado (`/[slug]/rsvp`, `/[slug]/mural`, etc)

---

## Implementação técnica

### Stack
- **Animação 2D:** SVG + CSS animations + Framer Motion
- **Drag gesture:** Framer Motion ou `@use-gesture/react`
- **Performance:** 60fps, com `transform` e `opacity` (não animar `top`/`left`)
- **Bundle:** assets otimizados (WebP/AVIF), JS gzipado < 300KB
- **Lazy load:** assets carregam progressivamente

### Schema sugerido (Prisma)

```prisma
enum CoupleType {
  HETERO
  TWO_BRIDES
  TWO_GROOMS
}

model Avatar {
  id            String      @id @default(cuid())
  slug          String      @unique  // ex: "casal-dono", "noiva-2", etc
  name          String
  type          AvatarType
  description   String?
  
  // Assets em diferentes estados
  fallingImageKey  String      // queda livre
  flyingImageKey   String      // voo suspenso
  failingImageKey  String      // fail
  
  // Metadata pra evolução futura
  isAvailable   Boolean     @default(true)
  order         Int         @default(0)
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  // Eventos que usam este avatar
  eventsAsBride Event[]     @relation("EventBride")
  eventsAsGroom Event[]     @relation("EventGroom")
}

enum AvatarType {
  BRIDE
  GROOM
}

// Adicionar ao Event existente:
model Event {
  // ... campos existentes
  coupleType        CoupleType  @default(HETERO)
  brideAvatarId     String?
  groomAvatarId     String?
  bride2AvatarId    String?  // só preenchido se coupleType == TWO_BRIDES
  groom2AvatarId    String?  // só preenchido se coupleType == TWO_GROOMS
  
  brideAvatar       Avatar?     @relation("EventBride", fields: [brideAvatarId], references: [id])
  groomAvatar       Avatar?     @relation("EventGroom", fields: [groomAvatarId], references: [id])
  // ... relacionamentos pra avatares secundários
}
```

### Renderização adaptativa

Componente de cena recebe o evento e renderiza adequadamente:

```typescript
function CoupleScene({ event }: { event: Event }) {
  const characters = useMemo(() => {
    switch (event.coupleType) {
      case 'HETERO':
        return [event.brideAvatar, event.groomAvatar];
      case 'TWO_BRIDES':
        return [event.brideAvatar, event.bride2Avatar];
      case 'TWO_GROOMS':
        return [event.groomAvatar, event.groom2Avatar];
    }
  }, [event]);
  
  // Animação roda igual independente do tipo
  return <FallingScene characters={characters} />;
}
```

### Assets necessários no MVP

**Personagens (par único representando o dono):**
- 6 imagens (2 personagens × 3 poses)
- Formato: PNG transparente em alta resolução (3x retina) ou SVG
- Nome no storage: `casal-dono-noiva-falling.png`, `casal-dono-noivo-flying.png`, etc

**Cenário:**
- 3-5 camadas de nuvens em paralaxe
- 1 imagem panorâmica de mar com horizonte
- Sol/orbe luminoso (pode ser CSS gradient)
- Backdrop de céu (CSS gradient)

**Total no MVP: ~10-13 assets**

### Fluxo de geração com IA

**Ferramenta principal:** Midjourney v7 com `--cref` (character reference)

**Custo estimado:** US$ 30/mês durante 1-2 meses (plano Standard) = R$ 165-330

**Sequência de produção:**

1. **Semana 1:** definir aparência dos personagens com a noiva. Gerar 30-50 conceitos da noiva, escolher direção, gerar 30-50 do noivo, escolher direção.

2. **Semana 2:** com referências aprovadas, usar `--cref` pra gerar as 3 poses de cada personagem. Iterar até consistência aceitável.

3. **Semana 3:** gerar cenário (céu, nuvens, mar). Remover fundos com Remove.bg ou Photopea.

4. **Semana 4:** Claude Code implementa a animação usando os assets.

5. **Semana 5:** testes em devices reais, ajustes.

### Prompts iniciais sugeridos pra Midjourney

```
Bride character in Super Mario Galaxy 3D animated style, 
[descrição específica acordada com noiva], white traditional 
wedding dress, falling from sky during sunset, arms slightly open, 
peaceful expression, full body, transparent background, vibrant 
colors, cinematic lighting --ar 9:16 --v 7
```

```
Groom character in Super Mario Galaxy 3D animated style, 
[descrição específica do dono], black traditional tuxedo, 
falling from sky during sunset, arms slightly open, peaceful 
expression, full body, transparent background, vibrant colors, 
cinematic lighting --ar 9:16 --v 7
```

```
Sunset sky with fluffy clouds in Super Mario Bros Movie animation 
style, warm pink orange purple gradient, dramatic lighting, no 
characters, mobile screen background --ar 9:16 --v 7
```

```
Calm ocean horizon view from above, sunset reflection on water, 
Mario movie animation style, peaceful, vibrant warm colors, no 
characters --ar 16:9 --v 7
```

(Substituir `[descrição]` pelas decisões finais com a noiva)

---

## Riscos e considerações

**Performance em mobiles antigos:** animação com paralaxe pode pesar em iPhones < geração 10 ou Android low-end. Definir budget rigoroso e testar em devices reais antes de deploy.

**Browsers antigos:** Safari iOS < 15 pode ter quirks. Fallback estático (imagem dos noivos com botão "Entrar no convite" direto) pra browsers que não suportam.

**Inconsistência da IA:** mesmo com `--cref`, há chance de pequenas variações entre poses do "mesmo" personagem. Aceitar imperfeição pequena ou usar Photopea pra ajustes manuais.

**Tempo:** 4-5 semanas é estimativa realista. Se atrasar, ter plano B de animação simplificada (cena estática com botão).

---

## Métricas de sucesso (após implementação)

- **Taxa de conclusão:** % que une os noivos antes do timeout (alvo: >85%)
- **Taxa de fail:** % que vê "tentar de novo" pelo menos 1 vez (alvo: <15%)
- **Tempo médio até unir:** (alvo: <8s)
- **Compartilhamento orgânico:** screenshots/shares nas redes
- **Feedback emocional:** comentários positivos pós-casamento

---

## Decisões finais consolidadas

| Pergunta | Resposta |
|---|---|
| Estilo de arte | Mario Galaxy / Mario Bros O Filme |
| Idade dos personagens | Sem idade clara, avatares estilizados |
| Trajes | Tradicionais (vestido branco + smoking) |
| Céu | Pôr do sol fixo |
| Plano de fundo embaixo | Mar com horizonte |
| Cena de fail | Tela escurece dramaticamente |
| Transição pós-click | Teleporta direto, sem fade |
| Som | Sem som |
| Acessibilidade (gesto alternativo) | Não no MVP |
| Animação pulável | Não, sempre roda |
| Timing | Antes do casamento |
| Geração de arte | Midjourney v7 com `--cref` |
| Tipos de casal suportados arquiteturalmente | HETERO, TWO_BRIDES, TWO_GROOMS desde o dia 1 |
| Avatares disponíveis no MVP | Apenas 1 (representando o casal dono) |
| Avatares adicionais | Pós-casamento, conforme arte for gerada |

---

## Pra quando começar

**Pré-requisitos:**
1. ✅ Decisões fechadas (esse documento)
2. ⏳ Bloco A (auth profissional) concluído
3. ⏳ Conversa com noiva sobre aparência dos personagens
4. ⏳ Assinar Midjourney (US$ 10-30/mês durante produção)

**Sequência:**
1. Terminar Bloco A
2. Em paralelo aos próximos blocos, gerar arte
3. Aprovar arte com a noiva
4. Implementar animação no código (Claude Code)
5. Testar em devices reais
6. Deploy

---

**Última atualização:** Maio 2026
**Status:** Especificação fechada. Aguardando conclusão do Bloco A.
