export type TestStatus = "ok" | "bug" | "skip" | "pending";

export interface ChecklistItem {
  id: string;
  section: string;
  title: string;
  url: string;
  steps: string[];
  expected: string;
  knownIssues?: string[];
}

export const CHECKLIST: ChecklistItem[] = [
  // Acesso
  {
    id: "auth-signup",
    section: "Acesso",
    title: "Cadastro novo",
    url: "/login",
    steps: [
      "Abra a página /login em aba anônima",
      "Clique na aba 'Criar conta'",
      "Preencha nome, e-mail e senha válidos",
      "Clique em 'Criar conta'",
      "Verifique redirecionamento para verificação de e-mail ou onboarding",
    ],
    expected: "Usuário criado com sucesso e redirecionado para tela de verificação de e-mail",
    knownIssues: [],
  },
  {
    id: "auth-login",
    section: "Acesso",
    title: "Login com senha",
    url: "/login",
    steps: [
      "Abra a página /login",
      "Clique na aba 'Entrar'",
      "Preencha e-mail e senha corretos",
      "Clique em 'Entrar'",
      "Verifique redirecionamento para /admin",
    ],
    expected: "Login bem-sucedido e redirecionamento para /admin",
    knownIssues: [],
  },
  {
    id: "auth-magic-link",
    section: "Acesso",
    title: "Link mágico (acessar sem senha)",
    url: "/login",
    steps: [
      "Abra /login em aba anônima",
      "Clique em 'Entrar sem senha' ou aba de magic link",
      "Digite o e-mail cadastrado",
      "Verifique chegada do e-mail com link",
      "Clique no link do e-mail e verifique autenticação",
    ],
    expected: "E-mail de magic link enviado e link autentica o usuário corretamente",
    knownIssues: [],
  },
  {
    id: "auth-reset-password",
    section: "Acesso",
    title: "Reset de senha",
    url: "/forgot-password",
    steps: [
      "Acesse /forgot-password",
      "Digite um e-mail cadastrado",
      "Clique em 'Receber link'",
      "Verifique chegada do e-mail",
      "Clique no link e defina nova senha",
      "Faça login com a nova senha",
    ],
    expected: "Senha redefinida com sucesso e login funciona com a nova senha",
    knownIssues: [],
  },

  // Verificação de email
  {
    id: "auth-verify-email",
    section: "Verificação de email",
    title: "Verificar email via link",
    url: "/verify-email",
    steps: [
      "Crie uma nova conta",
      "Acesse o e-mail de verificação recebido",
      "Clique no link de verificação",
      "Verifique que a conta fica marcada como verificada",
      "Verifique redirecionamento para onboarding ou /admin",
    ],
    expected: "E-mail verificado com sucesso e usuário redirecionado para o próximo passo",
    knownIssues: [],
  },
  {
    id: "auth-resend-verify",
    section: "Verificação de email",
    title: "Reenviar email de verificação",
    url: "/verify-email",
    steps: [
      "Acesse /verify-email com uma conta não verificada",
      "Clique em 'Reenviar e-mail'",
      "Verifique mensagem de confirmação de reenvio",
      "Verifique chegada do novo e-mail",
    ],
    expected: "E-mail de verificação reenviado e confirmação exibida na tela",
    knownIssues: [],
  },

  // Onboarding
  {
    id: "onboarding-flow",
    section: "Onboarding",
    title: "Fluxo de 3 telas do onboarding",
    url: "/admin/onboarding",
    steps: [
      "Entre com uma conta nova (primeiro acesso)",
      "Verifique exibição da tela 1 do onboarding",
      "Preencha os dados e avance para tela 2",
      "Avance para tela 3 e complete o onboarding",
      "Verifique redirecionamento para /admin",
    ],
    expected: "Onboarding completo em 3 telas e usuário redirecionado para painel principal",
    knownIssues: [],
  },

  // Wizard de evento
  {
    id: "event-wizard-create",
    section: "Wizard de evento",
    title: "Criar novo evento (wizard 4 passos)",
    url: "/admin/eventos/novo",
    steps: [
      "Clique em '+ Novo evento' no painel",
      "Preencha passo 1: nomes do casal e data",
      "Avance e preencha passo 2: locais e detalhes",
      "Avance e configure passo 3: features",
      "Complete passo 4 e publique ou salve rascunho",
      "Verifique redirecionamento para o painel do evento",
    ],
    expected: "Evento criado com sucesso em 4 passos e acessível no painel",
    knownIssues: [],
  },
  {
    id: "event-wizard-validation",
    section: "Wizard de evento",
    title: "Validação de campos do wizard",
    url: "/admin/eventos/novo",
    steps: [
      "Acesse /admin/eventos/novo",
      "Tente avançar o passo 1 com campos obrigatórios vazios",
      "Verifique erros inline em português",
      "Preencha dados inválidos (data no passado, slug com espaços)",
      "Verifique mensagens de erro específicas",
    ],
    expected: "Erros de validação exibidos inline em português, sem avançar o wizard",
    knownIssues: [],
  },

  // Configurações do evento
  {
    id: "event-settings-basic",
    section: "Configurações do evento",
    title: "Dados básicos (nomes, data, slug)",
    url: "/admin/eventos/[eventId]/configuracoes",
    steps: [
      "Acesse /admin/eventos/[eventId]/configuracoes",
      "Edite os nomes do casal",
      "Altere o slug e verifique validação de unicidade",
      "Salve e verifique mensagem de sucesso",
      "Recarregue a página e confirme os dados salvos",
    ],
    expected: "Dados básicos salvos corretamente e slug atualizado no banco",
    knownIssues: [],
  },
  {
    id: "event-settings-theme",
    section: "Configurações do evento",
    title: "Tema visual",
    url: "/admin/eventos/[eventId]/personalizar",
    steps: [
      "Acesse /admin/eventos/[eventId]/personalizar",
      "Selecione um tema diferente",
      "Salve e acesse a página pública do evento",
      "Verifique que o novo tema é aplicado",
    ],
    expected: "Tema alterado e refletido na página pública do evento",
    knownIssues: [],
  },

  // Convidados
  {
    id: "guests-list",
    section: "Convidados",
    title: "Lista de convidados (busca, filtros, abas)",
    url: "/admin/eventos/[eventId]/convidados",
    steps: [
      "Acesse /admin/eventos/[eventId]/convidados",
      "Use a barra de busca para filtrar por nome",
      "Teste os filtros por status (confirmado, pendente, recusado)",
      "Alterne entre abas e verifique contadores",
    ],
    expected: "Lista filtrada corretamente com contadores atualizados por aba",
    knownIssues: [],
  },
  {
    id: "guests-import",
    section: "Convidados",
    title: "Importação CSV/XLSX",
    url: "/admin/eventos/[eventId]/convidados/importar",
    steps: [
      "Acesse /admin/eventos/[eventId]/convidados/importar",
      "Baixe o template de importação",
      "Preencha o template com 3 convidados fictícios",
      "Faça upload do arquivo",
      "Verifique prévia dos dados e confirme importação",
      "Verifique que os convidados aparecem na lista",
    ],
    expected: "Convidados importados via planilha e visíveis na lista",
    knownIssues: [],
  },
  {
    id: "guests-whatsapp",
    section: "Convidados",
    title: "Link WhatsApp por convidado",
    url: "/admin/eventos/[eventId]/convidados",
    steps: [
      "Acesse a lista de convidados",
      "Clique no ícone/botão de WhatsApp de um convidado que tem telefone",
      "Verifique que o link abre corretamente com a mensagem pré-formatada",
    ],
    expected: "Link de WhatsApp abre com mensagem personalizada para o convidado",
    knownIssues: [],
  },
  {
    id: "guests-save-the-date",
    section: "Convidados",
    title: "Gerar PDFs save-the-date",
    url: "/admin/eventos/[eventId]/save-the-date",
    steps: [
      "Acesse /admin/eventos/[eventId]/save-the-date",
      "Selecione um ou mais convidados",
      "Clique em 'Gerar PDF'",
      "Verifique download do arquivo gerado",
      "Abra o PDF e confirme dados corretos",
    ],
    expected: "PDF de save-the-date gerado com nome do casal, data e dados do convidado",
    knownIssues: [],
  },

  // RSVP
  {
    id: "rsvp-confirm",
    section: "RSVP",
    title: "Confirmar presença (como convidado)",
    url: "/[slug]/rsvp",
    steps: [
      "Acesse /[slug]/rsvp via link de convite de um convidado",
      "Preencha os dados e selecione 'Confirmar presença'",
      "Adicione acompanhantes se necessário",
      "Submeta o formulário",
      "Verifique mensagem de confirmação",
    ],
    expected: "RSVP de confirmação registrado e mensagem de sucesso exibida",
    knownIssues: [],
  },
  {
    id: "rsvp-decline",
    section: "RSVP",
    title: "Recusar presença",
    url: "/[slug]/rsvp",
    steps: [
      "Acesse /[slug]/rsvp via link de convite",
      "Selecione 'Não poderei comparecer'",
      "Submeta o formulário",
      "Verifique mensagem adequada de recusa",
      "Verifique no admin que o status mudou para 'Recusado'",
    ],
    expected: "Recusa registrada e refletida no painel admin",
    knownIssues: [],
  },
  {
    id: "rsvp-edit",
    section: "RSVP",
    title: "Editar resposta após RSVP",
    url: "/[slug]/rsvp",
    steps: [
      "Acesse o link de RSVP de um convidado que já respondeu",
      "Verifique que os dados anteriores aparecem preenchidos",
      "Altere a resposta e submeta",
      "Verifique atualização no admin",
    ],
    expected: "Resposta editada com sucesso e painel admin reflete a mudança",
    knownIssues: [],
  },

  // Landing pública
  {
    id: "public-landing",
    section: "Landing pública",
    title: "Página pública do evento",
    url: "/[slug]",
    steps: [
      "Acesse /[slug] sem estar logado",
      "Verifique carregamento da página com nome do casal",
      "Verifique foto de capa, data e local",
      "Verifique navegação entre seções",
    ],
    expected: "Página pública carrega corretamente com todos os dados do evento",
    knownIssues: [],
  },
  {
    id: "public-locais",
    section: "Landing pública",
    title: "Seção de locais com mapa",
    url: "/[slug]",
    steps: [
      "Acesse /[slug] e navegue até a seção de locais",
      "Verifique que cerimônia e recepção aparecem listados",
      "Clique no link do mapa e verifique redirecionamento",
    ],
    expected: "Locais exibidos com endereço e link de mapa funcional",
    knownIssues: [],
  },
  {
    id: "public-historia",
    section: "Landing pública",
    title: "Linha do tempo",
    url: "/[slug]/historia",
    steps: [
      "Acesse /[slug]/historia",
      "Verifique exibição dos itens da história do casal em ordem",
      "Verifique fotos, datas e descrições",
    ],
    expected: "Timeline da história do casal exibida em ordem cronológica",
    knownIssues: [],
  },
  {
    id: "public-galeria",
    section: "Landing pública",
    title: "Galeria do casal",
    url: "/[slug]/galeria",
    steps: [
      "Acesse /[slug]/galeria",
      "Verifique carregamento das fotos da galeria do casal",
      "Clique em uma foto e verifique lightbox ou ampliação",
    ],
    expected: "Galeria carrega com todas as fotos e lightbox funcional",
    knownIssues: [],
  },
  {
    id: "public-presentes",
    section: "Landing pública",
    title: "Lista de presentes",
    url: "/[slug]/presentes",
    steps: [
      "Acesse /[slug]/presentes",
      "Verifique exibição dos presentes com preço e imagem",
      "Clique em 'Quero dar este presente' e verifique fluxo",
    ],
    expected: "Lista de presentes exibida corretamente com fluxo de doação funcional",
    knownIssues: [],
  },

  // Mural de fotos
  {
    id: "mural-upload",
    section: "Mural de fotos",
    title: "Upload de foto (com compressão)",
    url: "/[slug]/mural",
    steps: [
      "Acesse /[slug]/mural como convidado",
      "Clique em 'Adicionar foto'",
      "Selecione uma foto grande (>2MB)",
      "Verifique compressão automática antes do upload",
      "Confirme que a foto aparece no mural após upload",
    ],
    expected: "Foto comprimida e enviada com sucesso, exibida no mural",
    knownIssues: [],
  },
  {
    id: "mural-reactions",
    section: "Mural de fotos",
    title: "Reações em fotos (❤️😂🥹🎉)",
    url: "/[slug]/mural",
    steps: [
      "Acesse /[slug]/mural",
      "Clique em uma foto para abrir o painel de reações",
      "Adicione cada uma das 4 reações disponíveis",
      "Verifique contadores atualizados em tempo real",
    ],
    expected: "Reações adicionadas e contadores atualizados sem recarregar a página",
    knownIssues: [],
  },
  {
    id: "mural-moderation",
    section: "Mural de fotos",
    title: "Moderação admin de fotos",
    url: "/admin/eventos/[eventId]/mural",
    steps: [
      "Acesse /admin/eventos/[eventId]/mural",
      "Verifique lista de fotos pendentes e aprovadas",
      "Remova uma foto e verifique que desaparece do mural público",
      "Verifique que a ação fica registrada",
    ],
    expected: "Foto removida pelo admin desaparece do mural público imediatamente",
    knownIssues: [],
  },

  // Chat
  {
    id: "chat-send",
    section: "Chat",
    title: "Enviar mensagem de chat",
    url: "/[slug]/chat",
    steps: [
      "Acesse /[slug]/chat como convidado",
      "Digite uma mensagem e pressione Enter ou clique em Enviar",
      "Verifique que a mensagem aparece na lista",
      "Abra outro navegador e verifique que a mensagem aparece em tempo real",
    ],
    expected: "Mensagem enviada e exibida em tempo real para todos os participantes",
    knownIssues: [],
  },
  {
    id: "chat-typing",
    section: "Chat",
    title: "Indicador de digitação",
    url: "/[slug]/chat",
    steps: [
      "Abra o chat em dois navegadores com contas diferentes",
      "No primeiro, comece a digitar",
      "Verifique que o segundo exibe '... está digitando'",
      "Pare de digitar e verifique que o indicador some",
    ],
    expected: "Indicador de digitação aparece e desaparece corretamente em tempo real",
    knownIssues: [],
  },
  {
    id: "chat-reactions",
    section: "Chat",
    title: "Reações duplo-clique",
    url: "/[slug]/chat",
    steps: [
      "Acesse /[slug]/chat",
      "Dê duplo-clique em uma mensagem existente",
      "Verifique que o painel de reações aparece",
      "Adicione uma reação e verifique atualização",
    ],
    expected: "Reações adicionadas via duplo-clique e refletidas na mensagem",
    knownIssues: [],
  },

  // Playlist
  {
    id: "playlist-suggest",
    section: "Playlist",
    title: "Sugerir música via Spotify",
    url: "/[slug]/playlist",
    steps: [
      "Acesse /[slug]/playlist como convidado",
      "Clique em 'Sugerir música'",
      "Busque uma música pelo nome",
      "Selecione um resultado do Spotify",
      "Confirme a sugestão",
    ],
    expected: "Música sugerida com dados do Spotify (capa, artista) e listada aguardando aprovação",
    knownIssues: [],
  },
  {
    id: "playlist-vote",
    section: "Playlist",
    title: "Votar em música",
    url: "/[slug]/playlist",
    steps: [
      "Acesse /[slug]/playlist",
      "Clique no ícone de voto em uma música aprovada",
      "Verifique contador de votos atualizado",
      "Tente votar novamente e verifique que desfaz o voto",
    ],
    expected: "Voto registrado/removido e contador atualizado em tempo real",
    knownIssues: [],
  },
  {
    id: "playlist-admin",
    section: "Playlist",
    title: "Aprovar/rejeitar músicas",
    url: "/admin/eventos/[eventId]/playlist",
    steps: [
      "Acesse /admin/eventos/[eventId]/playlist",
      "Verifique músicas pendentes de aprovação",
      "Aprove uma música e verifique que fica visível na playlist pública",
      "Rejeite outra e verifique que some da lista pública",
    ],
    expected: "Músicas aprovadas/rejeitadas refletem imediatamente na playlist pública",
    knownIssues: [],
  },

  // Gincana
  {
    id: "gincana-progress",
    section: "Gincana",
    title: "Barra de progresso e missões",
    url: "/[slug]/gincana",
    steps: [
      "Acesse /[slug]/gincana como convidado",
      "Verifique exibição das missões disponíveis",
      "Verifique barra de progresso com pontos atuais",
      "Complete uma missão disponível",
      "Verifique atualização da barra de progresso",
    ],
    expected: "Missões listadas, barra de progresso atualizada após completar missão",
    knownIssues: [],
  },
  {
    id: "gincana-ranking",
    section: "Gincana",
    title: "Ranking top-3 com medalhas",
    url: "/[slug]/gincana",
    steps: [
      "Acesse /[slug]/gincana",
      "Verifique seção de ranking",
      "Confirme exibição de medalhas (ouro, prata, bronze) para top-3",
      "Verifique posição do convidado atual no ranking",
    ],
    expected: "Ranking exibido com medalhas para top-3 e posição do convidado destacada",
    knownIssues: [],
  },
  {
    id: "gincana-checkin",
    section: "Gincana",
    title: "Check-in via código",
    url: "/[slug]/checkin",
    steps: [
      "Acesse /[slug]/checkin como convidado",
      "Digite o código de check-in do local",
      "Clique em 'Já cheguei!'",
      "Verifique pontos creditados e mensagem de sucesso",
    ],
    expected: "Check-in registrado com pontos creditados e mensagem 'Presença marcada!'",
    knownIssues: [],
  },

  // Editor visual
  {
    id: "editor-visual",
    section: "Editor visual (M5.1)",
    title: "Ajustar cores e tipografia",
    url: "/admin/eventos/[eventId]/personalizar",
    steps: [
      "Acesse /admin/eventos/[eventId]/personalizar",
      "Ajuste uma cor primária usando o color picker",
      "Mude a tipografia para outra família de fonte",
      "Salve e acesse a página pública para confirmar as mudanças",
    ],
    expected: "Cores e tipografia customizadas aplicadas na página pública do evento",
    knownIssues: [],
  },

  // Plano de mesas
  {
    id: "mesas-create",
    section: "Plano de mesas (M5.2)",
    title: "Criar mesa e arrastar convidado",
    url: "/admin/eventos/[eventId]/mesas",
    steps: [
      "Acesse /admin/eventos/[eventId]/mesas",
      "Clique em 'Nova mesa' e defina nome e capacidade",
      "Arraste um convidado da lista para a mesa",
      "Verifique que o convidado aparece na mesa",
    ],
    expected: "Mesa criada e convidado alocado via drag-and-drop com persistência",
    knownIssues: [],
  },
  {
    id: "mesas-export",
    section: "Plano de mesas (M5.2)",
    title: "Exportar PDF do plano",
    url: "/admin/eventos/[eventId]/mesas",
    steps: [
      "Acesse /admin/eventos/[eventId]/mesas com mesas configuradas",
      "Clique em 'Exportar PDF'",
      "Verifique download do PDF",
      "Abra o PDF e confirme que todas as mesas e convidados estão listados",
    ],
    expected: "PDF exportado com todas as mesas e seus respectivos convidados",
    knownIssues: [],
  },

  // Cronograma
  {
    id: "cronograma-view",
    section: "Cronograma (M5.3)",
    title: "Ver roteiro do dia",
    url: "/[slug]/programacao",
    steps: [
      "Acesse /[slug]/programacao como convidado",
      "Verifique lista de itens do cronograma em ordem",
      "Confirme horários, títulos e locais de cada item",
    ],
    expected: "Cronograma do evento exibido em ordem cronológica com todos os detalhes",
    knownIssues: [],
  },
  {
    id: "cronograma-notifications",
    section: "Cronograma (M5.3)",
    title: "Ativar notificações de browser",
    url: "/[slug]/programacao",
    steps: [
      "Acesse /[slug]/programacao",
      "Clique em 'Ativar notificações'",
      "Autorize a permissão no browser",
      "Verifique mensagem de confirmação de ativação",
    ],
    expected: "Notificações de browser ativadas com confirmação visual",
    knownIssues: [],
  },

  // Ao Vivo
  {
    id: "ao-vivo-post",
    section: "Ao Vivo (M5.4)",
    title: "Postar update ao vivo",
    url: "/admin/eventos/[eventId]/ao-vivo",
    steps: [
      "Acesse /admin/eventos/[eventId]/ao-vivo",
      "Digite um título e descrição do update",
      "Clique em 'Publicar'",
      "Verifique que o update aparece na lista",
    ],
    expected: "Update publicado com sucesso e exibido na fila de updates ao vivo",
    knownIssues: [],
  },
  {
    id: "ao-vivo-guest",
    section: "Ao Vivo (M5.4)",
    title: "Convidado vê update em tempo real",
    url: "/[slug]/ao-vivo",
    steps: [
      "Abra /[slug]/ao-vivo em um navegador como convidado",
      "Em outro navegador (admin), publique um novo update",
      "Verifique que o update aparece automaticamente para o convidado sem recarregar",
    ],
    expected: "Updates ao vivo recebidos em tempo real via WebSocket sem recarregar a página",
    knownIssues: [],
  },

  // Quem é quem
  {
    id: "quem-e-quem",
    section: "Quem é quem (M5.5)",
    title: "Ver perfis públicos de convidados",
    url: "/[slug]/convidados",
    steps: [
      "Acesse /[slug]/convidados",
      "Verifique lista de convidados com perfil público",
      "Clique em um perfil e veja bio e relação com o casal",
    ],
    expected: "Perfis públicos dos convidados exibidos com bio e foto quando disponíveis",
    knownIssues: [],
  },

  // Agradecimentos
  {
    id: "agradecimentos-template",
    section: "Agradecimentos (M5.6)",
    title: "Gerar e copiar agradecimento",
    url: "/admin/eventos/[eventId]/agradecimentos",
    steps: [
      "Acesse /admin/eventos/[eventId]/agradecimentos",
      "Selecione um convidado com RSVP confirmado",
      "Clique em 'Gerar agradecimento'",
      "Verifique o template gerado com o nome do convidado",
      "Clique em 'Copiar' e verifique que vai para o clipboard",
    ],
    expected: "Template de agradecimento gerado com dados do convidado e copiado para clipboard",
    knownIssues: [],
  },

  // Digest de email
  {
    id: "digest-config",
    section: "Digest de email (M5.7)",
    title: "Configurar frequência do digest",
    url: "/admin/eventos/[eventId]/notificacoes",
    steps: [
      "Acesse /admin/eventos/[eventId]/notificacoes",
      "Altere a frequência do digest (diário/semanal/desativado)",
      "Salve a configuração",
      "Verifique mensagem de sucesso e persistência após recarregar",
    ],
    expected: "Frequência do digest salva e refletida nas configurações do organizador",
    knownIssues: [],
  },

  // Compartilhamento
  {
    id: "share-whatsapp",
    section: "Compartilhamento (M5.8)",
    title: "Compartilhar via WhatsApp",
    url: "/[slug]",
    steps: [
      "Acesse /[slug]",
      "Clique no botão de compartilhamento via WhatsApp",
      "Verifique que abre o WhatsApp com mensagem e link pré-formatados",
    ],
    expected: "Link de compartilhamento WhatsApp abre com mensagem e URL corretos do evento",
    knownIssues: [],
  },
  {
    id: "share-qr",
    section: "Compartilhamento (M5.8)",
    title: "Modal de QR code",
    url: "/[slug]",
    steps: [
      "Acesse /[slug]",
      "Clique no ícone de QR code",
      "Verifique abertura do modal com QR code",
      "Escaneie o QR code e confirme que leva ao URL correto",
    ],
    expected: "Modal com QR code funcional abrindo a URL do evento",
    knownIssues: [],
  },

  // Modo TV
  {
    id: "modo-tv",
    section: "Modo TV (M5.9)",
    title: "Slideshow fullscreen",
    url: "/[slug]/tv",
    steps: [
      "Acesse /[slug]/tv",
      "Verifique modo fullscreen com slideshow das fotos do mural",
      "Aguarde a rotação automática entre fotos",
      "Verifique informações sobrepostas (nome do convidado, data)",
    ],
    expected: "Slideshow fullscreen rotacionando fotos automaticamente com informações sobrepostas",
    knownIssues: [],
  },

  // Analytics
  {
    id: "analytics-kpis",
    section: "Analytics",
    title: "KPIs e gráficos",
    url: "/admin/eventos/[eventId]/analytics",
    steps: [
      "Acesse /admin/eventos/[eventId]/analytics",
      "Verifique KPIs: total de convidados, confirmados, fotos",
      "Verifique gráficos de evolução de RSVPs",
      "Verifique que os números batem com a lista de convidados",
    ],
    expected: "KPIs e gráficos carregados com dados corretos e atualizados",
    knownIssues: [],
  },

  // Moderação
  {
    id: "moderation-tabs",
    section: "Moderação",
    title: "4 abas de moderação",
    url: "/admin/eventos/[eventId]/moderacao",
    steps: [
      "Acesse /admin/eventos/[eventId]/moderacao",
      "Verifique 4 abas: Fotos, Mensagens, Denúncias, Convidados banidos",
      "Acesse cada aba e verifique o conteúdo",
      "Realize uma ação de moderação (ex: remover foto) e confirme efeito",
    ],
    expected: "4 abas de moderação funcionais com ações efetivas na plataforma",
    knownIssues: [],
  },

  // Notificações in-app
  {
    id: "notifications-bell",
    section: "Notificações in-app",
    title: "Sino com badge e dropdown",
    url: "/admin/eventos/[eventId]",
    steps: [
      "Acesse /admin/eventos/[eventId]",
      "Verifique sino de notificações no header",
      "Se houver notificações, verifique badge com número",
      "Clique no sino e verifique dropdown com notificações recentes",
      "Marque como lida e verifique que o badge atualiza",
    ],
    expected: "Sino com badge visível e dropdown de notificações funcional",
    knownIssues: [],
  },

  // Co-organizadores
  {
    id: "co-org-invite",
    section: "Co-organizadores",
    title: "Convidar co-organizador",
    url: "/admin/eventos/[eventId]/co-organizadores",
    steps: [
      "Acesse /admin/eventos/[eventId]/co-organizadores",
      "Digite o e-mail de um usuário cadastrado",
      "Clique em 'Convidar'",
      "Verifique que o convite é enviado e o co-org aparece na lista",
      "Faça login com a conta convidada e confirme acesso ao evento",
    ],
    expected: "Co-organizador convidado recebe acesso ao evento e aparece na lista de organizadores",
    knownIssues: [],
  },

  // LGPD e conta
  {
    id: "account-settings",
    section: "LGPD e conta",
    title: "Dados pessoais e senha",
    url: "/admin/conta",
    steps: [
      "Acesse /admin/conta",
      "Edite o nome e salve",
      "Troque a senha pelo formulário de mudança de senha",
      "Confirme que o login funciona com a nova senha",
    ],
    expected: "Nome atualizado e senha trocada com sucesso",
    knownIssues: [],
  },
  {
    id: "lgpd-export",
    section: "LGPD e conta",
    title: "Exportar dados ZIP",
    url: "/admin/conta",
    steps: [
      "Acesse /admin/conta",
      "Localize a seção de LGPD",
      "Clique em 'Exportar meus dados'",
      "Verifique download de arquivo ZIP",
      "Abra o ZIP e confirme que contém dados da conta e eventos",
    ],
    expected: "Arquivo ZIP com dados do usuário baixado corretamente conforme LGPD",
    knownIssues: [],
  },

  // Infraestrutura
  {
    id: "health-check",
    section: "Infraestrutura",
    title: "Health endpoint público",
    url: "/api/health",
    steps: [
      "Acesse /api/health sem autenticação",
      "Verifique resposta JSON com status ok",
      "Verifique campos: status, timestamp, db",
    ],
    expected: "Endpoint /api/health retorna JSON com status 'ok' e informações do sistema",
    knownIssues: [],
  },
  {
    id: "status-page",
    section: "Infraestrutura",
    title: "Página pública de status",
    url: "/status",
    steps: [
      "Acesse /status sem autenticação",
      "Verifique indicador de status do sistema",
      "Verifique latência do banco de dados",
      "Verifique uptime ou timestamp da última verificação",
    ],
    expected: "Página /status exibida com indicadores de saúde do sistema",
    knownIssues: [],
  },
  {
    id: "backups-list",
    section: "Infraestrutura",
    title: "Lista de backups",
    url: "/admin/saude/backups",
    steps: [
      "Acesse /admin/saude/backups",
      "Verifique lista de backups com datas",
      "Verifique tamanho e status de cada backup",
      "Teste o download de um backup recente",
    ],
    expected: "Lista de backups exibida com opção de download funcional",
    knownIssues: [],
  },
  {
    id: "pwa-install",
    section: "Infraestrutura",
    title: "PWA installable (manifest, ícones)",
    url: "/",
    steps: [
      "Acesse / no Chrome mobile ou desktop",
      "Verifique que o browser exibe prompt de instalação",
      "Instale o app",
      "Abra o app instalado e verifique splash screen e ícone corretos",
    ],
    expected: "App instalável como PWA com ícone, nome e splash screen corretos",
    knownIssues: [],
  },
];

export const SECTIONS = [...new Set(CHECKLIST.map((i) => i.section))];
