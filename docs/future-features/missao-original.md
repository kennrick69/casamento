# Missão original — Modo Gamificado do convite Voem.

> Texto **completo e sem edições** da missão passada pelo JOs, preservado como fonte histórica.
> A visão organizada, o plano de sprints e as decisões técnicas estão em [`modo-gamificado.md`](./modo-gamificado.md).
> Registrado em: 2026-11-17 · Branch: `feat/modo-gamificado`.

---

Claudio, nova missão grande no projeto do casamento (repo kennrick69/casamento, Voem.). O casamento do JOs e da Leticia voltou com tudo e agora vamos criar o MODO GAMIFICADO do convite. Leia tudo antes de começar.

# CONTEXTO
Hoje o Voem. é um site de convite (Next.js + Prisma + Postgres no Railway) com painel dos noivos, RSVP, presentes (Pix/Mercado Pago), mural, playlist, gincana, plano de mesas, modo TV etc. Os 5 temas atuais (classico, rustico, minimal, boho, praiano) sao so paletas de cores. A abertura "Una o Casal" (ProtoScene, noivos caindo, unir as maos, botao VOCE E DIGNO / PRESS START) esta pronta e aprovada, NAO mexer nela, os GIFs estao perfeitos.

O que vamos criar NAO é um tema novo: é uma EXPERIENCIA nova, um JOGO completo, um sistema a parte que usa o MESMO backend (mesmos dados de convidados, RSVP, presentes, fotos, playlist, pontos, painel).

# REGRA DE OURO
- O site atual continua existindo como experiencia CLASSICA. Nada do que funciona hoje pode quebrar.
- O site esta em producao (joseeleticia.com) e o Railway faz deploy a cada push na main. Trabalhem em branch e só levem para a main o que estiver estavel. Tudo do jogo fica atras da escolha de experiencia do evento.

# PASSO 0 - DOCUMENTO DE VISAO (antes de codar)
Crie docs/future-features/modo-gamificado.md com TODA esta especificacao organizada, mais o plano de sprints, o modelo de dados proposto e as decisoes tecnicas. Commite. Esse documento é a fonte da verdade do projeto.

# 1. BUG ATUAL (corrigir primeiro)
O botao PRESS START hoje faz router.push('/admin') e manda o convidado para o login do painel dos noivos. Isso esta errado. PRESS START deve levar o convidado para a experiencia do evento (jogo ou classica, conforme o evento). O painel continua em /admin so para os noivos. No dominio joseeleticia.com a raiz deve abrir o evento do casal.

# 2. TIPO DE EXPERIENCIA (painel dos noivos)
Na criacao/edicao do evento, a primeira escolha é o tipo de experiencia:
- CLASSICA: o site atual (a tela elegante atual é preservada e continua sendo opcao). Os temas de cores continuam valendo aqui.
- GAMIFICADA: o jogo descrito abaixo.

# 3. FLUXO DO CONVIDADO NO JOGO
Abertura Una o Casal -> PRESS START -> tela de titulo estilo game com NOVO JOGO e CONTINUAR / CARREGAR JOGO.

## 3.1 Entrada sem senha
- Um link/QR unico para todos os convidados.
- NOVO JOGO: nome + celular. O sistema procura o nome na lista de convidados ("Voce é a Marta Doerner?").
- Depois do cadastro, criar uma PASSKEY (WebAuthn: digital / Face ID, ex. biblioteca SimpleWebAuthn). Nas proximas visitas: PRESS START -> CONTINUAR -> digital -> carrega o save. Nao depende de cache (fica no chaveiro do celular e sincroniza com Google/iCloud). Nada de senha.
- Plano B: CARREGAR JOGO -> digita o celular -> recebe codigo por WhatsApp ou e-mail (aproveitar o acesso sem senha que ja existe).
- NAO usar IP, IMEI, MAC nem fingerprint de aparelho.

## 3.2 Acompanhantes
- No cadastro: "Vai levar acompanhante?" -> quantos (limite por convite definido no painel) -> para cada um: nome + adulto/crianca. Crianca vira boneco menor.
- O grupo anda junto em fila no jogo (estilo Pokemon / RPG classico).
- Se o acompanhante abrir o link e se cadastrar com o proprio celular, o sistema reconhece: "A Ana ja incluiu voce no grupo. É voce?" -> ele assume o proprio boneco, sem duplicar.

## 3.3 Visitantes (quem nao esta na lista)
- Chave no painel: Permitir visitantes sim/nao.
- Visitante pode: Nossa historia, Galeria, Correio (mensagem) e Presentes/Fonte dos desejos.
- Visitante NAO pode: confirmar presenca, escolher mesa, ver local/horario/salao.
- Botao "Pedir para ser convidado" -> pedido aparece no painel -> noivos aprovam ou recusam. Aprovado vira convidado e libera tudo.

## 3.4 Criacao do personagem
- Convidados (simples, menos de 1 minuto): cabelo curto ou comprido, cor do cabelo, cor da pele, traje. Botao aleatorio.
- Noivos (completa): varios tipos de cabelo (liso, ondulado, cacheado, coque, curto, comprido...), muitas cores, roupas exclusivas.
- BRANCO é exclusivo da noiva. Nenhum convidado pode escolher roupa branca.
- Sprites montaveis por camadas (paper-doll): corpo/pele, cabelo, roupa.

## 3.5 Papeis especiais com codigo (madrinhas e padrinhos)
- No cadastro do personagem: opcao "Sou madrinha" / "Sou padrinho" -> pede um CODIGO.
- Os codigos sao escolhidos pelos noivos no painel (um para madrinhas, outro para padrinhos) e podem ser trocados.
- Codigo correto libera e TRAVA o uniforme: madrinha usa o vestido na cor e estilo escolhidos pela noiva; padrinho usa o traje definido pelo noivo (ex. smoking com gravata-borboleta). Nao podem escolher outra roupa.
- Na hora aparece a mensagem escrita pelos noivos no painel (ex. "Madrinha, seu vestido deve ser verde-oliva, longo...").
- Por enquanto só madrinhas e padrinhos, mas o sistema deve ser GENERICO: os noivos poderao criar outros papeis no painel (pajem, daminha, pais dos noivos...), cada um com codigo, uniforme e mensagem.

# 4. MAPA DE FASES (estilo Super Mario World)
- Visao de cima, caminhos ligando pontos. A pessoa toca num ponto, o grupo anda ate la e aparece ENTRAR ou SEGUIR.
- A Recepcao (confirmar presenca) é obrigatoria e vem primeiro. Depois dela TODAS as fases ficam liberadas.
- Setinha/brilho indica o caminho principal sugerido. Fase concluida ganha bandeirinha. Quem completa todas ganha bonus (moedas extras / estrela no boneco).
- Fases (todas entram; se ficar excesso tiramos depois):
  1. Recepcao: confirmar presenca (obrigatoria)
  2. Nossa historia
  3. O grande dia: local, horario, traje, como chegar
  4. Correio: mensagem para o casal
  5. Loja de presentes
  6. Moeda dourada girando e brilhando numa bifurcacao -> fase secreta Fonte dos desejos (doacao via Pix / Mercado Pago, da pontos)
  7. Galeria: mural de fotos
  8. Quiz do casal
  9. Igrejinha no alto do morro: SO aparece se os noivos ligarem "cerimonia na igreja" no painel (no casamento do JOs NAO tem igreja)
  10. Salao de festas (sempre aberto, ver item 6)

# 5. DENTRO DAS FASES
- Perspectiva estilo RPG Maker / Pokemon Game Boy Advance, mas com pixel art de alta definicao (nivel Stardew Valley, estamos em 2026).
- Cada fase é um cenario pequeno com NPC. Interacao por caixa de dialogo classica de RPG.
- Cada fase usa a funcionalidade que ja existe no backend (RSVP, presentes, mensagens, galeria, playlist, gincana). O jogo é só outra apresentacao.

# 6. SALAO DE FESTAS (sempre aberto)
Cenario grande, camera acompanha o personagem como no Game Boy. Contem:
- DJ num canto com luzes piscando: mostra as musicas ja sugeridas e deixa sugerir (playlist existente).
- Cerimonialista: mostra o NUMERO de confirmados (ex. "62 de 80"), horario de inicio e as informacoes que os noivos escreverem no painel. NAO mostra nomes.
- Garcom: mostra o cardapio de bebidas e comidas cadastrado no painel e avisa se pode ou nao levar a propria bebida (opcao no painel).
- Fotografo: cantinho com as fotos ja enviadas (mesma galeria) e permite enviar fotos dali.
- Mesa dos noivos em destaque.
- Mesas reais com cadeiras:
  - Mesa mostra cadeiras ocupadas com o PRIMEIRO NOME (ex. "Mesa 7 - Melo, Trida, Duda + 3 lugares livres") e as livres.
  - "Sentar aqui" -> o grupo ocupa cadeiras lado a lado. Se nao couber: aviso + opcao procurar outra mesa ou dividir o grupo.
  - Mesas reservadas pelos noivos aparecem como "Reservada", sem nomes.
  - No cadastro, checkbox ja marcado: "Mostrar meu primeiro nome na mesa que eu escolher". Quem desmarcar aparece como "Convidado". Nunca nome completo, CPF etc. (LGPD).
  - Troca de mesa livre enquanto houver lugar, ate o prazo configurado no painel (padrao 10 dias antes).
  - Painel: "Confirmar escolha de mesa automaticamente: sim/nao". Se nao, a escolha fica pendente ate aprovacao dos noivos.
- Bonecos vivos: os bonecos de quem confirmou ficam SENTADOS nas mesas que escolheram. Só um numero limitado anda ao mesmo tempo (6 a 10, configuravel no painel), se revezando: levantam, vao a pista de danca, ao garcom, ao fotografo, ao DJ, e voltam. Sem nome (ou só primeiro nome de quem autorizou).

# 7. EDITOR DO SALAO VIRTUAL (painel dos noivos)
- Numero de mesas, estilo de cada uma (redonda, retangular, imperial), capacidade (4, 6, 8, 10...), posicao arrastando na planta.
- Posicionar tambem: mesa dos noivos, pista de danca, DJ, bar/garcom, cantinho do fotografo, entrada.
- O que os noivos montam é exatamente o salao que o convidado ve no jogo.
- Aproveitar e evoluir o plano de mesas drag-and-drop existente (SeatingTable) e o que fizer sentido da Sala 3D.

# 8. PONTOS, RANKING E PREMIOS
- Fases concluidas, doacao, fotos, check-ins e missoes dao moedas/pontos (integrar com a gincana existente).
- Ranking entre convidados. Premios configurados no painel por posicao (quantas posicoes premiar e o texto de cada premio). Sugestao padrao: 1o espumante + danca com os noivos, 2o primeiro pedaco do bolo, 3o kit de doces.
- Ranking ao vivo no telao (modo TV existente) e anuncio dos premiados na festa.

# 9. DIA DO CASAMENTO - QR CODES
- QR de presenca na entrada da festa: registra check-in e da pontos.
- QR de presenca na igreja, quando a igreja estiver habilitada: pontos proprios.
- QR codes de foto/missao espalhados (ex. nas mesas): levam direto ao upload das fotos pedidas (ex. foto com os noivos, foto da sua mesa). Fotos dao pontos e aparecem no fotografo e na galeria.
- TODO QR code pode ser ligado/desligado individualmente no painel, com a quantidade de pontos de cada um. Deixem essa parte bem ampla e flexivel.

# 10. EXTRAS
- Visor retro no topo (painel de nave estilo Star Wars / digitos LED) com contador: "FALTAM 194 DIAS". No dia: "É HOJE!".
- Som: uma musica para cada parte (titulo, mapa, cada fase, salao) + efeitos 8-bit (passos, moeda, porta, dialogo) + botao de mudo sempre visivel. A abertura Una o Casal continua SEM som; o som comeca no PRESS START.
- Lembretes automaticos apos o cadastro/confirmacao: o e-mail ja existe (7 e 1 dia antes); acrescentar lembretes configuraveis (ex. escolha sua mesa ate tal dia). WhatsApp automatico como opcao no painel (avaliar custo da API oficial e documentar), alem do botao de WhatsApp manual que ja existe.
- Capacidade total do evento no painel (numero maximo de convidados). Hoje NAO existe. Quando lotar, a confirmacao avisa.

# 11. TECNOLOGIA E ARTE
- Somente WEB (link/QR, pode ser adicionado a tela inicial como PWA). Nada de loja de aplicativos.
- Motor de jogo: Phaser 3 dentro do Next.js (componente client com import dinamico), consumindo as APIs existentes. Leve para celular.
- Arte: pacotes de pixel art GRATUITOS com licenca que permita USO COMERCIAL (ex. Kenney CC0, OpenGameArt, packs free do itch.io). Conferir a licenca de cada pacote e registrar em docs/ASSETS-LICENSES.md (nome, autor, link, licenca). Se precisarem de algum pacote pago ou de algo que eu precise baixar, listem no relatorio e eu providencio.
- Musicas: livres de direitos ou geradas por IA com licenca comercial; registrar no mesmo arquivo de licencas.

# 12. TUDO QUE FICA CONFIGURAVEL NO PAINEL (resumo)
Tipo de experiencia; permitir visitantes; limite de acompanhantes por convite; capacidade total; cerimonia na igreja sim/nao; codigos de papeis (madrinha, padrinho e futuros) com uniforme, cor e mensagem; informacoes do cerimonialista; cardapio do garcom e se pode levar bebida; editor do salao; confirmar mesa automaticamente sim/nao; prazo de troca de mesa; quantos bonecos andam no salao; QR codes (cada um liga/desliga + pontos); premios do ranking; lembretes (e-mail / WhatsApp e quais disparar).

# ORDEM SUGERIDA DE SPRINTS
S0 documento de visao + correcao do PRESS START
S1 tipo de experiencia no evento + campos de configuracao do painel (schema Prisma + migrations)
S2 identidade do convidado: cadastro, passkey, codigo de reserva, acompanhantes, reivindicar boneco, visitantes
S3 criador de personagem em camadas + papeis com codigo
S4 tela de titulo + mapa de fases + framework de fase + fase Recepcao (RSVP)
S5 demais fases
S6 editor do salao no painel + cena do salao com NPCs, mesas e bonecos vivos
S7 pontos, ranking, premios, QR codes, telao, som, contador retro, lembretes

# OBRIGATORIO
- Commits organizados por sprint. Nada quebra a experiencia classica.
- Ao fim de cada sprint, atualize docs/STATUS.md e um RELATORIO-MODO-GAMIFICADO.md com: o que foi feito, como testar (links), screenshots/descricao para eu avaliar pelo celular, decisoes tomadas e o que precisam de mim.
- Sigam as regras em _shared/ (autonomia na execucao; decisoes de risco irreversivel registradas em logs/decisoes-criticas.md).

Comecem pelo PASSO 0 e pela correcao do PRESS START. Capricha, esse é o casamento do JOs.
