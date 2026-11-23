import { prisma } from "@/lib/db";
import { EXCLUDE_VISITORS } from "@/lib/guest-filters";
import { isMenuConfigured } from "@/lib/game/cardapio";

// ---------------------------------------------------------------------------
// Prontidão da configuração do evento ("Progresso do casamento").
//
// Organizado pela JORNADA DO JOGADOR: cada item diz o que um boneco/fase do jogo
// precisa pra não ficar vazio (ou pior, mostrar conteúdo de EXEMPLO/falso). A ideia
// é o casal não "achar que terminou" com fases ocas. Tudo é só leitura (counts).
//
// `npc`      → qual boneco PROMETE esse conteúdo (se vazio, vira "mina terrestre").
// `required` → entra no cálculo do % (o portão). Opcionais aparecem mas não gatilham.
// ---------------------------------------------------------------------------

export type ItemStatus = "done" | "missing" | "warn";

export interface ReadinessItem {
  id: string;
  label: string;
  hint: string;
  href: string;
  status: ItemStatus;
  required: boolean;
  count?: number;
  /** Boneco do jogo que depende desse conteúdo (promete ao convidado). */
  npc?: string;
  /** Vazio/falso enquanto um NPC já fala sobre ele → destaque vermelho. */
  landmine?: boolean;
}

export interface ReadinessGroup {
  id: string;
  title: string;
  subtitle?: string;
  items: ReadinessItem[];
}

export interface EventReadiness {
  groups: ReadinessGroup[];
  percent: number;
  requiredTotal: number;
  requiredDone: number;
  landmines: ReadinessItem[];
  published: boolean;
}

export async function getEventReadiness(eventId: string): Promise<EventReadiness> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return { groups: [], percent: 0, requiredTotal: 0, requiredDone: 0, landmines: [], published: false };
  }

  const [
    convidados,
    convites,
    memorias,
    mesas,
    roteiro,
    checkins,
    missoes,
    locais,
    galeria,
    presentes,
    padrinhos,
  ] = await Promise.all([
    prisma.guest.count({ where: { eventId, deletedAt: null, ...EXCLUDE_VISITORS } }),
    prisma.inviteCode.count({ where: { eventId } }),
    prisma.coupleStoryItem.count({ where: { eventId } }),
    prisma.seatingTable.count({ where: { eventId } }),
    prisma.journeyItem.count({ where: { eventId } }),
    prisma.checkinCode.count({ where: { eventId } }),
    prisma.mission.count({ where: { eventId } }),
    prisma.eventLocation.count({ where: { eventId } }),
    prisma.galleryPhoto.count({ where: { eventId } }),
    prisma.gift.count({ where: { eventId } }),
    prisma.weddingPartyMember.count({ where: { eventId } }),
  ]);

  const features = (event.features ?? {}) as Record<string, boolean>;
  const base = `/admin/eventos/${eventId}`;
  const on = (k: string) => features[k] !== false; // ausente = ligado por padrão
  const st = (ok: boolean): ItemStatus => (ok ? "done" : "missing");

  const cardapioOk = isMenuConfigured(event.menu);
  const gincanaOn = on("gamification");
  const presentesOn = on("donations");

  const groups: ReadinessGroup[] = [
    {
      id: "logistica",
      title: "Antes de enviar os convites",
      subtitle: "A base: sem isso, não há a quem mandar o convite.",
      items: [
        {
          id: "convidados",
          label: "Lista de convidados",
          hint: "Cadastre (ou importe) quem você vai convidar.",
          href: `${base}/convidados`,
          status: st(convidados > 0),
          required: true,
          count: convidados,
        },
        {
          id: "convites",
          label: "Convites gerados",
          hint: "Gere os códigos/links de convite para enviar.",
          href: `${base}/convites`,
          status: st(convites > 0),
          required: true,
          count: convites,
        },
      ],
    },
    {
      id: "vila",
      title: "Vila — a chegada",
      subtitle: "Onde a Recepcionista recebe o convidado.",
      items: [
        {
          id: "dados",
          label: "Nomes do casal e data",
          hint: "Dados básicos do evento.",
          href: `${base}/configuracoes`,
          status: st(!!event.coupleNames && !!event.ceremonyDate),
          required: true,
        },
        {
          id: "rsvp",
          label: "Confirmação de presença (RSVP) ligada",
          hint: "A Recepcionista leva o convidado para confirmar presença.",
          href: `${base}/configuracoes`,
          status: st(on("rsvp")),
          required: true,
          npc: "Recepcionista",
        },
        {
          id: "cerimonia-local",
          label: "Local da cerimônia",
          hint: "Onde e endereço — aparece na página pública.",
          href: `${base}/locais`,
          status: st(!!event.ceremonyLocation),
          required: false,
        },
      ],
    },
    {
      id: "bosque",
      title: "Bosque — as memórias",
      subtitle: "A fase inteira gira em torno das memórias do casal.",
      items: [
        {
          id: "memorias",
          label: "Memórias do casal",
          hint: "Cada memória vira um pedestal no Bosque. Sem elas, a fase fica vazia.",
          href: `${base}/historia`,
          status: st(memorias > 0),
          required: true,
          count: memorias,
          npc: "Pedestais de memória",
          landmine: memorias === 0,
        },
      ],
    },
    {
      id: "grande-dia",
      title: "Grande Dia — o salão",
      subtitle: "Os 4 bonecos da festa (DJ, Fotógrafo, Cerimonialista, Garçom) + as mesas.",
      items: [
        {
          id: "mesas",
          label: "Mesas e lugares",
          hint: "Sem mesas, ninguém encontra o próprio lugar no salão.",
          href: `${base}/mesas`,
          status: st(mesas > 0),
          required: true,
          count: mesas,
          npc: "Lugares do salão",
          landmine: mesas === 0,
        },
        {
          id: "cardapio",
          label: "Cardápio do Garçom",
          hint: cardapioOk
            ? "Cardápio real cadastrado."
            : "O Garçom está mostrando um cardápio de EXEMPLO. Cadastre o real!",
          href: `${base}/cardapio`,
          status: cardapioOk ? "done" : "warn",
          required: true,
          npc: "Garçom",
          landmine: !cardapioOk,
        },
        {
          id: "roteiro",
          label: "Roteiro / horários do dia",
          hint: "O Cerimonialista promete mostrar o roteiro com os horários.",
          href: `${base}/roteiro`,
          status: st(roteiro > 0),
          required: true,
          count: roteiro,
          npc: "Cerimonialista",
          landmine: roteiro === 0,
        },
        {
          id: "mural",
          label: "Mural de fotos ligado",
          hint: "O Fotógrafo convida o convidado a mandar fotos no mural.",
          href: `${base}/configuracoes`,
          status: st(on("photoWall")),
          required: false,
          npc: "Fotógrafo",
        },
        {
          id: "playlist",
          label: "Playlist ligada",
          hint: "O DJ pede a música do convidado. Confira também a conexão com o Spotify.",
          href: `${base}/playlist`,
          status: st(on("playlist")),
          required: false,
          npc: "DJ",
        },
        {
          id: "mensagem-mesa",
          label: "Recado ao achar a mesa",
          hint: "Mensagem carinhosa que aparece quando o convidado encontra o lugar (opcional).",
          href: `${base}/cardapio`,
          status: st(!!event.tableFoundMessage),
          required: false,
        },
      ],
    },
    {
      id: "gincana",
      title: "Locais & Gincana",
      subtitle: "Pontos, check-in e missões da brincadeira.",
      items: [
        {
          id: "checkin",
          label: "Códigos de check-in dos locais",
          hint: "Sem código, o convidado não consegue marcar 'Já cheguei!' e ganhar pontos.",
          href: `${base}/gincana`,
          status: st(checkins > 0),
          required: gincanaOn,
          count: checkins,
          npc: "Check-in da gincana",
          landmine: gincanaOn && checkins === 0,
        },
        {
          id: "missoes",
          label: "Missões da gincana",
          hint: "As missões que valem pontos.",
          href: `${base}/gincana`,
          status: st(missoes > 0),
          required: false,
          count: missoes,
        },
        {
          id: "locais",
          label: "Locais detalhados",
          hint: "Lista de locais com mapa (opcional — já há o local básico da cerimônia).",
          href: `${base}/locais`,
          status: st(locais > 0),
          required: false,
          count: locais,
        },
      ],
    },
    {
      id: "extras",
      title: "Extras (opcionais)",
      subtitle: "Enriquecem a experiência, mas não travam o convite.",
      items: [
        {
          id: "galeria",
          label: "Galeria do casal",
          hint: "Fotos do casal na página pública.",
          href: `${base}/galeria`,
          status: st(galeria > 0),
          required: false,
          count: galeria,
        },
        {
          id: "padrinhos",
          label: "Padrinhos e madrinhas",
          hint: "Equipe do casamento na página pública.",
          href: `${base}/personalizar`,
          status: st(padrinhos > 0),
          required: false,
          count: padrinhos,
        },
        ...(presentesOn
          ? [
              {
                id: "presentes",
                label: "Lista de presentes",
                hint: "Presentes para os convidados escolherem.",
                href: `${base}/presentes`,
                status: st(presentes > 0),
                required: false,
                count: presentes,
              } as ReadinessItem,
            ]
          : []),
      ],
    },
  ];

  const allItems = groups.flatMap((g) => g.items);
  const requiredItems = allItems.filter((i) => i.required);
  const requiredDone = requiredItems.filter((i) => i.status === "done").length;
  const requiredTotal = requiredItems.length;
  const percent = requiredTotal === 0 ? 100 : Math.round((requiredDone / requiredTotal) * 100);
  const landmines = allItems.filter((i) => i.landmine);

  return {
    groups,
    percent,
    requiredTotal,
    requiredDone,
    landmines,
    published: event.status === "PUBLISHED",
  };
}
