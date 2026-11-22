"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Info, MapPin, Lock } from "lucide-react";
import { WORLD, PHASES, tableGrid, type LevelId } from "@/lib/game/world";
import type { Controls, Interactable, SceneConfig, NpcAvatar } from "./game-canvas";
import type { TableSeatMap } from "@/lib/game/seats";
import { CARDAPIO } from "@/lib/game/cardapio";
import { leaveMessageForCouple } from "../actions";
import { chooseSeat } from "./seat-actions";

// Phaser roda só no cliente (sem SSR). ssr:false exige Client Component (Next 16).
const GameCanvas = dynamic(() => import("./game-canvas").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-neutral-400">
      <Loader2 className="size-6 animate-spin" aria-hidden /> <span className="ml-2 text-sm">Carregando a festa…</span>
    </div>
  ),
});

// ─── Tipos de dados vindos do servidor ──────────────────────────────────────
export interface Memory {
  id: string;
  title: string;
  dateLabel: string | null;
  description: string | null;
  photoUrl: string | null;
}
export interface TableInfo {
  id: string;
  name: string;
  capacity: number;
}
export interface GameProgress {
  phase1: boolean;
  phase2: boolean;
  phase3: boolean;
  memoriesSeen: string[];
}

export interface MapaClientProps {
  slug: string;
  coupleNames: string;
  playerName: string;
  atlasUrl: string;
  isVisitor: boolean;
  isOrganizer: boolean;
  rsvpConfirmed: boolean;
  memories: Memory[];
  tables: TableInfo[];
  myTableId: string | null;
  seatMaps: Record<string, TableSeatMap>;
  canChooseSeat: boolean;
  companionCount: number;
  coupleMessage: string | null;
  brideAtlas: string;
  groomAtlas: string;
  npcAtlases: { dj: string; fotografo: string; cerimonialista: string; garcom: string };
  followers: { atlasUrl: string; child: boolean }[];
  progress: GameProgress;
}

type SalaoNpc = "dj" | "fotografo" | "cerimonialista" | "garcom";
const NPC_LABEL: Record<SalaoNpc, string> = {
  dj: "DJ",
  fotografo: "Fotógrafo",
  cerimonialista: "Cerimonialista",
  garcom: "Garçom",
};

type View = "world" | LevelId;

export function MapaClient(props: MapaClientProps) {
  const { slug, coupleNames, playerName, atlasUrl, isVisitor, rsvpConfirmed } = props;
  // Visitante (item 31) e organizador logado em dev jogam com tudo liberado.
  const freeRoam = isVisitor || props.isOrganizer;
  const router = useRouter();
  const controls = useRef<Controls>({ up: false, down: false, left: false, right: false, interact: false });
  // Item 52: controle imperativo da caixa de diálogo (A avança/escolhe, B volta,
  // D-pad cima/baixo move o cursor) — ligado aos botões A/B e ao D-pad touch.
  const dialogRef = useRef<GameDialogHandle | null>(null);

  const [debug, setDebug] = useState(false);
  // Controles touch (D-pad/A) só aparecem em telas de toque (item 13). No PC
  // usa-se teclado (setas/WASD + Enter).
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const touch =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window || navigator.maxTouchPoints > 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsTouch(!!touch);
  }, []);

  // Progresso: fase 1 também conclui quando o RSVP está CONFIRMED.
  const [progress, setProgress] = useState<GameProgress>(() => ({
    ...props.progress,
    phase1: props.progress.phase1 || rsvpConfirmed,
  }));

  const [view, setView] = useState<View>("world");
  const [near, setNear] = useState<Interactable | null>(null);
  const [dialog, setDialog] = useState<null | "npc" | "memory" | "table" | "credits" | "gate" | "seat" | "salao">(null);
  const [activeNpc, setActiveNpc] = useState<SalaoNpc | null>(null);
  // Garçom: sub-tela do diálogo (pergunta → cardápio → bebidas).
  const [garcomView, setGarcomView] = useState<"ask" | "food" | "drinks">("ask");
  const [activeMemory, setActiveMemory] = useState<Memory | null>(null);
  const [tableMsg, setTableMsg] = useState<{ name: string; mine: boolean } | null>(null);
  // S4b: escolha de lugar. Mapa de cadeiras e "minha mesa" ficam em estado local
  // (mudam ao escolher, sem recarregar a página).
  const [seatMaps, setSeatMaps] = useState<Record<string, TableSeatMap>>(props.seatMaps);
  const [myTableId, setMyTableId] = useState<string | null>(props.myTableId);
  const [seatTarget, setSeatTarget] = useState<{ id: string; name: string; free: number } | null>(null);
  const [seatSaving, setSeatSaving] = useState(false);
  const partySize = 1 + props.companionCount;
  const [goingToRsvp, setGoingToRsvp] = useState(false);
  const [debugPoint, setDebugPoint] = useState<{ x: number; y: number } | null>(null);
  // Spawn de teste (dev): ?px=&py= posiciona o avatar num ponto exato da fase —
  // usado para provar a profundidade (boneco atrás de cada objeto) por screenshot.
  const [spawnOverride, setSpawnOverride] = useState<{ x: number; y: number } | null>(null);
  // Dev: ?node=N posiciona o avatar parado na plataforma N do mapa-múndi (prova
  // de "parar de frente em cima da pedra" — itens 47/49/50), sem precisar viajar.
  const [worldStartNode, setWorldStartNode] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  // Recado do visitante para os noivos (missão alternativa da vila — item 30/31)
  const [recadoText, setRecadoText] = useState("");
  const [recadoSending, setRecadoSending] = useState(false);
  const [recadoSent, setRecadoSent] = useState(false);

  // Item 31 (decisão do JOs): VISITANTE entra com TODAS as fases liberadas desde
  // o início — as missões continuam, mas não travam nada para ele. Convidado da
  // lista segue a progressão normal (missão → libera a próxima).
  const unlocked = useMemo(
    () => ({
      vila: true,
      bosque: freeRoam || progress.phase1,
      "grande-dia": freeRoam || progress.phase2,
    }),
    [progress.phase1, progress.phase2, freeRoam],
  );

  // Lê ?debug=1 e ?start=<fase> só no cliente. ?start é atalho de teste (dev):
  // pula direto para a fase, para qualquer usuário (item 30).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q.get("debug") === "1") setDebug(true);
    const start = q.get("start") as LevelId | null;
    if (start && (start === "vila" || start === "bosque" || start === "grande-dia")) {
      setView(start);
    }
    const px = Number(q.get("px"));
    const py = Number(q.get("py"));
    if (Number.isFinite(px) && Number.isFinite(py) && q.has("px") && q.has("py")) {
      setSpawnOverride({ x: px, y: py });
    }
    const node = Number(q.get("node"));
    if (q.has("node") && Number.isInteger(node) && node >= 0 && node < WORLD.nodes.length) {
      setWorldStartNode(node);
    }
  }, []);

  // Item 43: ao trocar de fase/cena (ou voltar ao mapa), fecha TODOS os diálogos/
  // modais da cena anterior — senão uma memória/recado/mesa aberta fica por cima.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setDialog(null);
    setActiveMemory(null);
    setActiveNpc(null);
    setTableMsg(null);
    setSeatTarget(null);
    setNear(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [view]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  // Botão B / Esc / X: voltar. Fecha o diálogo aberto; senão, sai da fase para o
  // mapa-múndi (item 39). No mapa-múndi não faz nada.
  const goBack = useCallback(() => {
    if (dialog) {
      setDialog(null);
      return;
    }
    if (view !== "world") setView("world");
  }, [dialog, view]);

  // PC: Esc/X = voltar (B). (Enter/E/Z = ação são tratados no canvas.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "x" || e.key === "X") {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack]);

  // ── persiste o progresso no servidor (fire-and-forget) ──
  const persist = useCallback(
    (next: GameProgress) => {
      fetch(`/${slug}/jogo/mapa/progress`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      }).catch(() => {});
    },
    [slug],
  );

  // ─── Monta o SceneConfig conforme a view ───
  const config: SceneConfig = useMemo(() => {
    if (view === "world") {
      const interactables: Interactable[] = WORLD.markers.map((m) => {
        const node = WORLD.nodes[m.node];
        const done = m.id === "vila" ? progress.phase1 : m.id === "bosque" ? progress.phase2 : progress.phase3;
        const locked = !unlocked[m.id];
        return {
          id: `mk-${m.id}`,
          x: node.x,
          y: node.y,
          radius: 44,
          kind: "marker",
          label: m.label,
          locked,
          done,
          glyph: locked ? "lock" : done ? "star" : "pin",
        };
      });
      return {
        mode: "world",
        map: WORLD.map,
        w: WORLD.w,
        h: WORLD.h,
        atlasUrl,
        spawn: { x: WORLD.nodes[worldStartNode].x, y: WORLD.nodes[worldStartNode].y, facing: "down" },
        nodes: WORLD.nodes,
        edges: WORLD.edges,
        startNode: worldStartNode,
        interactables,
        followers: props.followers,
        debug,
      };
    }

    const phase = PHASES[view];
    let interactables: Interactable[] = [];
    let npcs: NpcAvatar[] | undefined;

    if (view === "vila") {
      interactables = [
        {
          id: "npc",
          x: phase.anchors.npc.x,
          y: phase.anchors.npc.y,
          kind: "npc",
          glyph: progress.phase1 ? "check" : "bang", // missão "!" sobre o NPC (item 29)
          done: progress.phase1,
          label: "Recepcionista",
        },
        {
          id: "gate",
          x: phase.anchors.gate.x,
          y: phase.anchors.gate.y,
          kind: "gate",
          glyph: progress.phase1 || freeRoam ? "flower" : "lock",
          locked: !progress.phase1 && !freeRoam,
          label: "Portão de flores",
        },
      ];
    } else if (view === "bosque") {
      const peds = phase.pedestals ?? [];
      interactables = props.memories.slice(0, peds.length).map((mem, i) => ({
        id: `ped-${i}`,
        x: peds[i].x,
        y: peds[i].y,
        kind: "pedestal",
        glyph: progress.memoriesSeen.includes(mem.id) ? "check" : "bang", // "!" da missão (item 29)
        done: progress.memoriesSeen.includes(mem.id),
        label: mem.title,
      }));
      interactables.push({
        id: "exit",
        x: phase.anchors.exit.x,
        y: phase.anchors.exit.y,
        kind: "gate",
        glyph: "door",
        label: "Voltar ao mapa",
      });
    } else if (view === "grande-dia") {
      const grid = tableGrid(props.tables.length);
      interactables = props.tables.slice(0, grid.length).map((t, i) => {
        const map = seatMaps[t.id];
        const mine = t.id === myTableId;
        const free = map?.freeCount ?? t.capacity;
        // "!" só aparece quando ainda há algo a fazer: escolher um lugar (sem mesa
        // ainda) numa mesa com vagas, ou encontrar a minha mesa já reservada.
        const needsChoice = props.canChooseSeat && !myTableId && free >= partySize;
        const glyph = mine ? (progress.phase3 ? "check" : "bang") : needsChoice ? "bang" : undefined;
        return {
          id: `table-${t.id}`,
          x: grid[i].x,
          y: grid[i].y,
          kind: "table" as const,
          label: t.name,
          tableLabel: t.name,
          highlight: mine,
          glyph,
          done: mine && progress.phase3,
          capacity: t.capacity,
          seats: map?.cells,
          radius: 110, // mesa grande (item 37): alcance de interação > raio do corpo
        };
      });
      // NPCs do salão (PARTE 3): DJ, Fotógrafo, Cerimonialista, Garçom. Cada um é
      // um sprite (npcs) + um ponto de interação sólido (interactables kind "npc"),
      // com sparkle discreto e colisão pela base (item 48 / NPCS-SALAO.md).
      const salao: { key: SalaoNpc; a: typeof phase.anchors.dj; atlas: string }[] = [
        { key: "dj", a: phase.anchors.dj, atlas: props.npcAtlases.dj },
        { key: "fotografo", a: phase.anchors.fotografo, atlas: props.npcAtlases.fotografo },
        { key: "cerimonialista", a: phase.anchors.cerimonialista, atlas: props.npcAtlases.cerimonialista },
        { key: "garcom", a: phase.anchors.garcom, atlas: props.npcAtlases.garcom },
      ];
      npcs = [
        { x: phase.anchors.brideStand.x, y: phase.anchors.brideStand.y, atlasUrl: props.brideAtlas, facing: "down" },
        { x: phase.anchors.groomStand.x, y: phase.anchors.groomStand.y, atlasUrl: props.groomAtlas, facing: "down" },
        ...salao.map((n) => ({ x: n.a.x, y: n.a.y, atlasUrl: n.atlas, facing: "down" as const })),
      ];
      interactables.push(
        ...salao.map((n) => ({
          id: `npc-${n.key}`,
          x: n.a.x,
          y: n.a.y,
          kind: "npc" as const,
          label: NPC_LABEL[n.key],
          solid: true,
          radius: 68,
        })),
      );
    }

    return {
      mode: "phase",
      map: phase.map,
      w: phase.w,
      h: phase.h,
      atlasUrl,
      spawn: spawnOverride ? { ...phase.spawn, ...spawnOverride } : phase.spawn,
      collisionUrl: phase.collision,
      walkMaskUrl: phase.walkMask,
      interactables,
      npcs,
      followers: props.followers,
      overlays: phase.overlays,
      debug,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, atlasUrl, debug, spawnOverride, worldStartNode, progress, unlocked, props.memories, props.tables, myTableId, seatMaps]);

  // ─── Interação (A / Enter / botão) ───
  const handleInteract = useCallback(
    (id: string) => {
      // mapa-múndi: entrar numa fase
      if (view === "world") {
        if (id.startsWith("mk-")) {
          const lvl = id.slice(3) as LevelId;
          if (!unlocked[lvl]) {
            showToast("Conclua a fase anterior para liberar esta.");
            return;
          }
          setNear(null);
          setView(lvl);
        }
        return;
      }
      // Vila
      if (view === "vila") {
        if (id === "npc") setDialog("npc");
        if (id === "gate" && (progress.phase1 || freeRoam)) {
          const next = { ...progress, phase1: true };
          setProgress(next);
          persist(next);
          setView("world");
          showToast("Fase da Vila concluída! O Bosque foi liberado.");
        }
        return;
      }
      // Bosque
      if (view === "bosque") {
        if (id === "exit") {
          setView("world");
          return;
        }
        if (id.startsWith("ped-")) {
          const i = parseInt(id.slice(4), 10);
          const mem = props.memories[i];
          if (!mem) return;
          setActiveMemory(mem);
          setDialog("memory");
          if (!progress.memoriesSeen.includes(mem.id)) {
            const seen = [...progress.memoriesSeen, mem.id];
            const allSeen = props.memories.length > 0 && props.memories.every((m) => seen.includes(m.id));
            const next = { ...progress, memoriesSeen: seen, phase2: progress.phase2 || allSeen };
            setProgress(next);
            persist(next);
            if (allSeen) showToast("Você reviveu todas as memórias! O Grande Dia foi liberado.");
          }
        }
        return;
      }
      // Grande Dia
      if (view === "grande-dia") {
        if (id.startsWith("npc-")) {
          setActiveNpc(id.slice(4) as SalaoNpc);
          setGarcomView("ask");
          setDialog("salao");
          return;
        }
        if (id.startsWith("table-")) {
          const tid = id.slice(6);
          const t = props.tables.find((x) => x.id === tid);
          if (!t) return;
          const mine = tid === myTableId;
          // Minha mesa (já reservada) OU visitante/sem permissão → mensagem.
          if (mine || !props.canChooseSeat) {
            setTableMsg({ name: t.name, mine });
            setDialog("table");
            if (mine && !progress.phase3) {
              const next = { ...progress, phase3: true };
              setProgress(next);
              persist(next);
            }
            return;
          }
          // Ainda não escolhi → dialog de escolha ("Sentar aqui").
          const free = seatMaps[tid]?.freeCount ?? t.capacity;
          setSeatTarget({ id: tid, name: t.name, free });
          setDialog("seat");
        }
        return;
      }
    },
    [view, unlocked, progress, freeRoam, props.memories, props.tables, props.canChooseSeat, myTableId, seatMaps, persist, showToast],
  );

  // S4b: confirma a escolha de lugar (eu + família) na mesa alvo.
  const confirmSeat = useCallback(() => {
    if (!seatTarget || seatSaving) return;
    setSeatSaving(true);
    chooseSeat(slug, seatTarget.id)
      .then((r) => {
        setSeatSaving(false);
        if (!r.ok) {
          showToast(r.message ?? "Não deu para reservar agora.");
          return;
        }
        if (r.maps) setSeatMaps(r.maps);
        setMyTableId(r.myTableId ?? seatTarget.id);
        setDialog(null);
        setSeatTarget(null);
        if (!progress.phase3) {
          const next = { ...progress, phase3: true };
          setProgress(next);
          persist(next);
        }
        showToast("Lugar reservado! Siga o brilho até a sua mesa.");
      })
      .catch(() => {
        setSeatSaving(false);
        showToast("Não deu para reservar agora. Tente de novo.");
      });
  }, [seatTarget, seatSaving, slug, progress, persist, showToast]);

  const press = (key: keyof Controls, value: boolean) => {
    // Item 52: com a caixa aberta, o D-pad move o cursor das escolhas e o boneco
    // não anda; sem caixa, dirige o avatar normalmente.
    if (dialog) {
      if (value && key === "up") dialogRef.current?.moveUp();
      if (value && key === "down") dialogRef.current?.moveDown();
      return;
    }
    controls.current[key] = value;
  };

  // Visitante deixa um recado → conclui a Vila (sem RSVP) e guarda a mensagem.
  const sendRecado = () => {
    if (!recadoText.trim() || recadoSending) return;
    setRecadoSending(true);
    leaveMessageForCouple(slug, recadoText)
      .then((r) => {
        setRecadoSending(false);
        if (!r.ok) {
          showToast(r.message);
          return;
        }
        setRecadoSent(true);
        if (!progress.phase1) {
          const next = { ...progress, phase1: true };
          setProgress(next);
          persist(next);
        }
      })
      .catch(() => {
        setRecadoSending(false);
        showToast("Não deu para enviar agora. Tente de novo.");
      });
  };

  const areaTitle = view === "world" ? "Mapa da festa" : PHASES[view].title;
  const missionHint =
    view === "grande-dia" && myTableId
      ? `Vá até a sua mesa: ${props.tables.find((t) => t.id === myTableId)?.name ?? ""}`
      : view === "grande-dia" && props.canChooseSeat
        ? "Escolha onde sentar: chegue perto de uma mesa e aperte"
        : view === "grande-dia"
          ? "Explore o salão à vontade"
          : view === "bosque"
            ? `Memórias: ${progress.memoriesSeen.length}/${props.memories.length}`
            : null;

  // Item 52: constrói a MESMA caixa de diálogo (estilo GBA) para todos os casos —
  // recepcionista, memória, mesa e créditos. Texto, escolhas e campos variam.
  function renderDialog() {
    if (!dialog) return null;
    const close = () => setDialog(null);

    if (dialog === "npc") {
      if (isVisitor && recadoSent) {
        return (
          <GameDialog
            apiRef={dialogRef}
            isTouch={isTouch}
            onBack={close}
            title="Recepcionista"
            body={`Que carinho, ${playerName}! Seu recado foi guardado para ${coupleNames}. A festa toda está liberada — aproveite cada fase!`}
            choices={[{ key: "ok", label: "Oba!", onSelect: close }]}
          />
        );
      }
      if (isVisitor) {
        return (
          <GameDialog
            apiRef={dialogRef}
            isTouch={isTouch}
            onBack={close}
            title="Recepcionista"
            body={`Olá, ${playerName}! Visitantes não confirmam presença, mas que tal deixar um carinho para ${coupleNames}? Você já pode explorar todas as fases.`}
            extra={
              <textarea
                value={recadoText}
                onChange={(e) => setRecadoText(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Escreva seu recado para os noivos…"
                className="mt-2 w-full resize-none rounded border-2 border-[#8a6d3b] bg-[#fffdf5] px-3 py-2 text-sm text-[#3a2a1a] placeholder:text-[#a08a63] focus:border-[#c9a24b] focus:outline-none"
              />
            }
            extraWhenDone
            choices={[
              { key: "no", label: "Agora não", onSelect: close },
              {
                key: "send",
                label: recadoSending ? "Enviando" : "Enviar recado",
                disabled: recadoSending || !recadoText.trim(),
                loading: recadoSending,
                onSelect: sendRecado,
              },
            ]}
          />
        );
      }
      if (progress.phase1) {
        return (
          <GameDialog
            apiRef={dialogRef}
            isTouch={isTouch}
            onBack={close}
            title="Recepcionista"
            body={`Sua presença já está confirmada, ${playerName}! Atravesse o portão de flores à direita para seguir viagem.`}
            choices={[{ key: "ok", label: "Oba!", onSelect: close }]}
          />
        );
      }
      return (
        <GameDialog
          apiRef={dialogRef}
          isTouch={isTouch}
          onBack={close}
          title="Recepcionista"
          body={`Bem-vindo(a) à Vila, ${playerName}! Para liberar o resto da festa, primeiro confirme sua presença. Vamos lá?`}
          choices={[
            { key: "no", label: "Agora não", onSelect: close },
            {
              key: "go",
              label: goingToRsvp ? "Abrindo" : "Confirmar presença",
              loading: goingToRsvp,
              onSelect: () => {
                setGoingToRsvp(true);
                router.push(`/${slug}/rsvp`);
              },
            },
          ]}
        />
      );
    }

    if (dialog === "memory" && activeMemory) {
      return (
        <GameDialog
          apiRef={dialogRef}
          isTouch={isTouch}
          onBack={close}
          title={activeMemory.dateLabel ?? "Memória"}
          body={[activeMemory.title, activeMemory.description].filter(Boolean).join("\n\n")}
          extra={
            activeMemory.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeMemory.photoUrl}
                alt={activeMemory.title}
                className="mt-2 max-h-40 w-full rounded border-2 border-[#8a6d3b] object-cover"
              />
            ) : undefined
          }
          choices={[{ key: "ok", label: "Continuar", onSelect: close }]}
        />
      );
    }

    if (dialog === "table" && tableMsg) {
      const body = tableMsg.mine
        ? `Encontrou seu lugar, ${playerName}! ${
            props.coupleMessage ?? `${coupleNames} agradecem de coração por você estar aqui neste dia.`
          }`
        : myTableId
          ? "Essa não é a sua mesa — siga o brilho sobre a sua."
          : "Fique à vontade para explorar o salão!";
      return (
        <GameDialog
          apiRef={dialogRef}
          isTouch={isTouch}
          onBack={close}
          title={tableMsg.name}
          body={body}
          choices={[{ key: "ok", label: "Fechar", onSelect: close }]}
        />
      );
    }

    // S4b: escolher lugar nesta mesa (eu + família).
    if (dialog === "seat" && seatTarget) {
      const enough = seatTarget.free >= partySize;
      const quem = partySize === 1 ? "você" : `você e mais ${props.companionCount}`;
      const body = enough
        ? `${seatTarget.name} tem ${seatTarget.free} ${seatTarget.free === 1 ? "lugar livre" : "lugares livres"}. Quer sentar aqui com a sua família? Vou reservar ${partySize} ${partySize === 1 ? "lugar" : "lugares"} (${quem}).`
        : `${seatTarget.name} tem só ${seatTarget.free} ${seatTarget.free === 1 ? "lugar livre" : "lugares livres"} — a sua família precisa de ${partySize}. Procure outra mesa com mais lugares.`;
      return (
        <GameDialog
          apiRef={dialogRef}
          isTouch={isTouch}
          onBack={close}
          title={seatTarget.name}
          body={body}
          choices={
            enough
              ? [
                  { key: "no", label: "Agora não", onSelect: close },
                  {
                    key: "sit",
                    label: seatSaving ? "Reservando" : "Sentar aqui",
                    loading: seatSaving,
                    disabled: seatSaving,
                    onSelect: confirmSeat,
                  },
                ]
              : [{ key: "ok", label: "Procurar outra", onSelect: close }]
          }
        />
      );
    }

    // PARTE 3: NPCs do salão. Garçom mostra o cardápio; os outros abrem a função.
    if (dialog === "salao" && activeNpc) {
      const go = (path: string) => () => {
        setGoingToRsvp(true);
        router.push(`/${slug}${path}`);
      };
      if (activeNpc === "garcom") {
        // Duas opções (cursor ▶): Cardápio (comidas) e Bebidas (termina com o
        // aviso de que pode trazer a própria bebida). Conteúdo em @/lib/game/cardapio.
        if (garcomView === "food") {
          return (
            <GameDialog
              apiRef={dialogRef}
              isTouch={isTouch}
              onBack={() => setGarcomView("ask")}
              title="Garçom"
              body={`Hoje temos:\n\n${CARDAPIO.foods.map((f) => `• ${f}`).join("\n")}`}
              choices={[
                { key: "drinks", label: "Ver as bebidas", onSelect: () => setGarcomView("drinks") },
                { key: "ok", label: "Fechar", onSelect: close },
              ]}
            />
          );
        }
        if (garcomView === "drinks") {
          return (
            <GameDialog
              apiRef={dialogRef}
              isTouch={isTouch}
              onBack={() => setGarcomView("ask")}
              title="Garçom"
              body={`Para beber:\n\n${CARDAPIO.drinks.map((d) => `• ${d}`).join("\n")}\n\n${CARDAPIO.byoNotice}`}
              choices={[
                { key: "food", label: "Ver o cardápio", onSelect: () => setGarcomView("food") },
                { key: "ok", label: "Fechar", onSelect: close },
              ]}
            />
          );
        }
        return (
          <GameDialog
            apiRef={dialogRef}
            isTouch={isTouch}
            onBack={close}
            title="Garçom"
            body="Olá! Quer ver o cardápio ou as bebidas?"
            choices={[
              { key: "food", label: "Cardápio", onSelect: () => setGarcomView("food") },
              { key: "drinks", label: "Bebidas", onSelect: () => setGarcomView("drinks") },
            ]}
          />
        );
      }
      const npcDialog: Record<Exclude<SalaoNpc, "garcom">, { body: string; action: string; path: string }> = {
        dj: {
          body: `E aí, ${playerName}? Qual música não pode faltar hoje? Deixa o seu pedido que eu toco!`,
          action: "Pedir música",
          path: "/playlist",
        },
        fotografo: {
          body: `Vou registrar cada momento! E você também pode: mande as suas fotos no mural da festa.`,
          action: "Enviar fotos",
          path: "/mural",
        },
        cerimonialista: {
          body: `Bem-vindo(a)! Quer saber como vai ser a festa? Te mostro o roteiro com os horários.`,
          action: "Ver o roteiro",
          path: "/roteiro",
        },
      };
      const d = npcDialog[activeNpc];
      return (
        <GameDialog
          apiRef={dialogRef}
          isTouch={isTouch}
          onBack={close}
          title={NPC_LABEL[activeNpc]}
          body={d.body}
          choices={[
            { key: "no", label: "Agora não", onSelect: close },
            { key: "go", label: goingToRsvp ? "Abrindo" : d.action, loading: goingToRsvp, onSelect: go(d.path) },
          ]}
        />
      );
    }

    if (dialog === "credits") {
      return (
        <GameDialog
          apiRef={dialogRef}
          isTouch={isTouch}
          onBack={close}
          title="Créditos"
          body={CREDITS_TEXT}
          choices={[{ key: "ok", label: "Fechar", onSelect: close }]}
        />
      );
    }

    return null;
  }

  return (
    // fixed inset-0: o jogo ocupa a tela inteira, cobrindo o chrome do layout
    // público (barra de abas, toggles) — experiência imersiva de tela cheia.
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-900 text-neutral-100">
      {/* Barra superior */}
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        {view === "world" ? (
          <Link href={`/${slug}/jogo`} className="inline-flex items-center gap-1 text-sm text-neutral-300 hover:text-white">
            <ArrowLeft className="size-4" aria-hidden /> Sair
          </Link>
        ) : (
          <button
            onClick={() => setView("world")}
            className="inline-flex items-center gap-1 text-sm text-neutral-300 hover:text-white"
          >
            <MapPin className="size-4" aria-hidden /> Mapa
          </button>
        )}
        <span className="truncate text-sm font-semibold">{areaTitle}</span>
        <button
          onClick={() => setDialog("credits")}
          aria-label="Créditos"
          className="inline-flex items-center gap-1 text-sm text-neutral-300 hover:text-white"
        >
          <Info className="size-4" aria-hidden /> Créditos
        </button>
      </header>

      {missionHint && (
        <div className="shrink-0 px-3 pb-1 text-center text-xs text-emerald-300">{missionHint}</div>
      )}

      {/* Palco do jogo (ocupa o resto da tela) */}
      <div className="relative min-h-0 flex-1">
        <GameCanvas
          config={config}
          controls={controls}
          paused={dialog !== null}
          onNearChange={setNear}
          onInteract={handleInteract}
          onDebugPoint={debug ? setDebugPoint : undefined}
        />

        {/* Dica de proximidade (linha única, sem cortar na borda — itens 19/32a) */}
        {near && !dialog && (
          <div className="pointer-events-none absolute left-1/2 top-4 flex max-w-[92%] -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-lg bg-black/80 px-4 py-2 text-sm shadow-lg">
            {near.locked ? (
              <>
                <Lock className="size-4 shrink-0 text-neutral-300" aria-hidden />
                <span className="truncate font-semibold">{near.label}</span>
                <span className="shrink-0 text-neutral-400">— bloqueado</span>
              </>
            ) : (
              <>
                <span className="truncate font-semibold">{near.label || "Interagir"}</span>
                <span className="shrink-0 text-neutral-300">· aperte</span>
                <kbd className="shrink-0 rounded bg-neutral-700 px-1.5 py-0.5 text-xs">{isTouch ? "A" : "Enter"}</kbd>
                {!isTouch && <span className="shrink-0 text-xs text-neutral-400">ou E</span>}
              </>
            )}
          </div>
        )}

        {/* Coordenadas do mouse (debug) */}
        {debug && debugPoint && (
          <div className="pointer-events-none absolute right-2 top-2 rounded bg-black/80 px-2 py-1 font-mono text-xs text-lime-300">
            x:{debugPoint.x} y:{debugPoint.y}
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="pointer-events-none absolute bottom-24 left-1/2 w-[85%] max-w-sm -translate-x-1/2 rounded-lg bg-emerald-700/95 px-4 py-2 text-center text-sm shadow-lg">
            {toast}
          </div>
        )}

        {/* Controles touch — só em telas de toque (item 13) */}
        {isTouch && (
          <>
            <div
              className="absolute bottom-6 left-5 select-none"
              style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
            >
              <DPad onPress={press} />
            </div>
            {/* Botões A/B estilo GBA (item 39): à direita, opostos ao D-pad, em
                diagonal. A = ação (interagir); B = voltar/cancelar. Pixel-art,
                semitransparentes. */}
            <div
              className="absolute bottom-10 right-5 z-30 select-none"
              style={{ bottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))" }}
            >
              <button
                type="button"
                aria-label="B — voltar"
                onPointerDown={goBack}
                className="absolute bottom-10 right-16 flex size-14 items-center justify-center rounded-full border-2 border-indigo-200/60 bg-indigo-700/40 text-lg font-black text-white shadow-md backdrop-blur-sm transition active:scale-95 active:bg-indigo-700/90"
              >
                B
              </button>
              <button
                type="button"
                aria-label="A — ação"
                onPointerDown={() => {
                  // Item 52: com a caixa aberta, A completa/avança o texto e
                  // confirma a escolha; sem caixa, interage com o cenário.
                  if (dialog) dialogRef.current?.advance();
                  else controls.current.interact = true;
                }}
                className="flex size-16 items-center justify-center rounded-full border-2 border-rose-200/60 bg-rose-700/45 text-xl font-black text-white shadow-md backdrop-blur-sm transition active:scale-95 active:bg-rose-700/90"
              >
                A
              </button>
            </div>
          </>
        )}

        {/* Item 52: caixa de diálogo estilo GBA/Pokémon, no TOPO da área do jogo
            (nunca atrás do D-pad/A/B). Mesma caixa para TODOS os diálogos. */}
        {renderDialog()}
      </div>
    </div>
  );
}

// ─── Item 52: caixa de diálogo estilo GBA/Pokémon ───────────────────────────
interface DialogChoice {
  key: string;
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onSelect: () => void;
}
interface GameDialogHandle {
  advance: () => void; // A: completa o texto / vira a página / confirma a escolha
  moveUp: () => void; // cursor ▲ na lista de escolhas
  moveDown: () => void; // cursor ▼ na lista de escolhas
  back: () => void; // B/Esc: voltar/fechar
}

const CREDITS_TEXT =
  "Arte dos personagens derivada do LPC (Liberated Pixel Cup) — peças sob CC-BY, CC-BY-SA ou OGA-BY. Motor Phaser 3 (MIT)." +
  "\n\nStephen Challener (Redshrike), Johannes Sjölund (wulax), Eliza Wyatt (ElizaWy), JaidynReiman, Benjamin K. Smith (BenCreating), bluecarrot16, Matthew Krohn (makrohn), Manuel Riecke (MrBeast), Nila122, Thane Brimhall (pennomi), laetissima, kheftel, Carlo Enrico Victoria (Nemisys)." +
  "\n\nLista completa de peças e licenças em docs/ASSETS-LICENSES.md. Mapas: arte do projeto Voem.";

// Quebra o texto em páginas (sem rolagem) respeitando limites de palavra.
function paginate(text: string, max: number): string[] {
  if (!text) return [""];
  const pages: string[] = [];
  for (const block of text.split("\n\n")) {
    let cur = "";
    for (const word of block.split(/\s+/)) {
      if (cur && (cur + " " + word).length > max) {
        pages.push(cur);
        cur = word;
      } else {
        cur = cur ? cur + " " + word : word;
      }
    }
    if (cur) pages.push(cur);
  }
  return pages.length ? pages : [""];
}

// Caixa única de diálogo: moldura pixel dupla (clara + contorno escuro, cantos
// dentados), fundo creme, plaquinha de nome, texto com efeito máquina de escrever
// e escolhas em lista com cursor "▶". A/avança, setas/cursor, B/volta. Mesma
// caixa para memória, recepcionista, mesa e créditos.
function GameDialog({
  title,
  body,
  choices,
  onBack,
  isTouch,
  apiRef,
  extra,
  extraWhenDone,
}: {
  title: string;
  body: string;
  choices: DialogChoice[];
  onBack: () => void;
  isTouch: boolean;
  apiRef: React.RefObject<GameDialogHandle | null>;
  extra?: React.ReactNode;
  extraWhenDone?: boolean;
}) {
  const pages = useMemo(() => paginate(body, 170), [body]);
  const [pageIdx, setPageIdx] = useState(0);
  const [typed, setTyped] = useState(0);
  const [sel, setSel] = useState(0);

  const page = pages[pageIdx] ?? "";
  const typing = typed < page.length;
  const lastPage = pageIdx >= pages.length - 1;
  const showChoices = lastPage && !typing;
  const moreAfter = !typing && !lastPage;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTyped(0);
  }, [pageIdx, body]);

  useEffect(() => {
    if (typed >= page.length) return;
    const id = window.setTimeout(() => setTyped((t) => Math.min(page.length, t + 1)), 18);
    return () => window.clearTimeout(id);
  }, [typed, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSel((s) => Math.min(Math.max(0, s), Math.max(0, choices.length - 1)));
  }, [choices.length]);

  // snapshot do estado atual para os controles imperativos e o teclado.
  // Atualizado num effect (não no render) — o ref só é LIDO em handlers/effects,
  // que rodam sempre após o commit, então o snapshot está sempre atualizado.
  const stateRef = useRef({ typing, page, lastPage, sel, choices, showChoices, onBack });
  useEffect(() => {
    stateRef.current = { typing, page, lastPage, sel, choices, showChoices, onBack };
  });

  useEffect(() => {
    const api: GameDialogHandle = {
      advance() {
        const s = stateRef.current;
        if (s.typing) {
          setTyped(s.page.length);
          return;
        }
        if (!s.lastPage) {
          setPageIdx((i) => i + 1);
          return;
        }
        const c = s.choices[s.sel];
        if (c && !c.disabled && !c.loading) c.onSelect();
      },
      moveUp() {
        if (stateRef.current.showChoices) setSel((v) => Math.max(0, v - 1));
      },
      moveDown() {
        const s = stateRef.current;
        if (s.showChoices) setSel((v) => Math.min(s.choices.length - 1, v + 1));
      },
      back() {
        stateRef.current.onBack();
      },
    };
    apiRef.current = api;
    return () => {
      if (apiRef.current === api) apiRef.current = null;
    };
  }, [apiRef]);

  // Teclado: Enter/Espaço/Z/E = A; setas/W/S = cursor; Esc = B. Não sequestra as
  // teclas quando o foco está num campo de texto (recado do visitante).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toUpperCase();
      if (e.key === "Escape") {
        e.preventDefault();
        apiRef.current?.back();
        return;
      }
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (["Enter", " ", "z", "Z", "e", "E"].includes(e.key)) {
        e.preventDefault();
        apiRef.current?.advance();
      } else if (["ArrowUp", "w", "W"].includes(e.key)) {
        e.preventDefault();
        apiRef.current?.moveUp();
      } else if (["ArrowDown", "s", "S"].includes(e.key)) {
        e.preventDefault();
        apiRef.current?.moveDown();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [apiRef]);

  const shown = page.slice(0, typed);
  const pixelFont = "var(--font-press-start), monospace";

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 top-0 z-20 flex justify-center px-2"
      style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))" }}
    >
      <style>{"@keyframes dlgblink{0%,100%{opacity:1}50%{opacity:0}}"}</style>
      <div className="relative w-full max-w-2xl">
        {/* plaquinha/aba com o nome (fonte pixel do projeto) */}
        <div
          className="absolute -top-2 left-3 z-10 px-2 py-1"
          style={{
            background: "#2a1d12",
            color: "#ffeec2",
            border: "2px solid #c9a24b",
            borderRadius: "3px",
            fontFamily: pixelFont,
            fontSize: "10px",
            letterSpacing: "0.5px",
            boxShadow: "2px 2px 0 rgba(0,0,0,0.35)",
          }}
        >
          {title}
        </div>
        {/* caixa: moldura dupla pixel, cantos dentados, fundo creme */}
        <div
          onClick={() => apiRef.current?.advance()}
          className="cursor-pointer select-none pt-5"
          style={{
            background: "#f7eccf",
            border: "4px solid #2a1d12",
            boxShadow:
              "inset 0 0 0 3px #fff8e8, inset 0 0 0 6px #c9a24b, inset 0 0 0 8px #6b4a2a, 3px 3px 0 rgba(0,0,0,0.3)",
            clipPath:
              "polygon(5px 0,calc(100% - 5px) 0,100% 5px,100% calc(100% - 5px),calc(100% - 5px) 100%,5px 100%,0 calc(100% - 5px),0 5px)",
            imageRendering: "pixelated",
          }}
        >
          <div className="px-5 pb-4">
            <p
              style={{
                fontFamily: "var(--font-lora), Georgia, serif",
                fontSize: "15px",
                lineHeight: 1.5,
                color: "#3a2a1a",
                minHeight: "3em",
                whiteSpace: "pre-wrap",
              }}
            >
              {shown}
            </p>

            {extra && (!extraWhenDone || showChoices) && <div onClick={(e) => e.stopPropagation()}>{extra}</div>}

            {showChoices ? (
              <ul className="mt-3 space-y-1.5">
                {choices.map((c, i) => (
                  <li
                    key={c.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!c.disabled && !c.loading) c.onSelect();
                    }}
                    className="flex cursor-pointer items-center gap-2"
                    style={{ fontFamily: pixelFont, fontSize: "11px", color: c.disabled ? "#a08a63" : "#3a2a1a" }}
                  >
                    <span style={{ width: "14px", color: "#b5853a" }}>{i === sel ? "▶" : ""}</span>
                    <span>{c.loading ? "…" : c.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              moreAfter && (
                <div
                  className="mt-1 text-right"
                  style={{ fontFamily: pixelFont, fontSize: "12px", color: "#6b4a2a", animation: "dlgblink 1s steps(1) infinite" }}
                >
                  ▼
                </div>
              )
            )}

            {showChoices && (
              <p className="mt-2 text-right" style={{ fontFamily: pixelFont, fontSize: "8px", color: "#a08a63" }}>
                {isTouch ? "A escolher · B voltar" : "Enter escolher · Esc voltar"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// D-pad de 4 direções para toque.
function DPad({ onPress }: { onPress: (key: keyof Controls, value: boolean) => void }) {
  // semitransparente (não tapa o mapa) e mais opaco ao tocar (item 25)
  const btn =
    "flex size-12 items-center justify-center rounded-lg border border-neutral-300/40 bg-neutral-700/35 text-xl text-white/90 shadow-md backdrop-blur-sm transition active:bg-emerald-600/85 touch-none";
  const bind = (key: keyof Controls) => ({
    onPointerDown: () => onPress(key, true),
    onPointerUp: () => onPress(key, false),
    onPointerLeave: () => onPress(key, false),
    onPointerCancel: () => onPress(key, false),
  });
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1">
      <span />
      <button type="button" aria-label="Cima" className={btn} {...bind("up")}>↑</button>
      <span />
      <button type="button" aria-label="Esquerda" className={btn} {...bind("left")}>←</button>
      <span />
      <button type="button" aria-label="Direita" className={btn} {...bind("right")}>→</button>
      <span />
      <button type="button" aria-label="Baixo" className={btn} {...bind("down")}>↓</button>
      <span />
    </div>
  );
}
