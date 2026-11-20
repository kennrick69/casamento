"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Info, MapPin, X, Lock, MessageSquare } from "lucide-react";
import { WORLD, PHASES, tableGrid, type LevelId } from "@/lib/game/world";
import type { Controls, Interactable, SceneConfig, NpcAvatar } from "./game-canvas";
import { leaveMessageForCouple } from "../actions";

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
  coupleMessage: string | null;
  brideAtlas: string;
  groomAtlas: string;
  progress: GameProgress;
}

type View = "world" | LevelId;

export function MapaClient(props: MapaClientProps) {
  const { slug, coupleNames, playerName, atlasUrl, isVisitor, rsvpConfirmed } = props;
  // Visitante (item 31) e organizador logado em dev jogam com tudo liberado.
  const freeRoam = isVisitor || props.isOrganizer;
  const router = useRouter();
  const controls = useRef<Controls>({ up: false, down: false, left: false, right: false, interact: false });

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
  const [dialog, setDialog] = useState<null | "npc" | "memory" | "table" | "credits" | "gate">(null);
  const [activeMemory, setActiveMemory] = useState<Memory | null>(null);
  const [tableMsg, setTableMsg] = useState<{ name: string; mine: boolean } | null>(null);
  const [goingToRsvp, setGoingToRsvp] = useState(false);
  const [debugPoint, setDebugPoint] = useState<{ x: number; y: number } | null>(null);
  // Spawn de teste (dev): ?px=&py= posiciona o avatar num ponto exato da fase —
  // usado para provar a profundidade (boneco atrás de cada objeto) por screenshot.
  const [spawnOverride, setSpawnOverride] = useState<{ x: number; y: number } | null>(null);
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
  }, []);

  // Item 43: ao trocar de fase/cena (ou voltar ao mapa), fecha TODOS os diálogos/
  // modais da cena anterior — senão uma memória/recado/mesa aberta fica por cima.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setDialog(null);
    setActiveMemory(null);
    setTableMsg(null);
    setNear(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [view]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

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
        spawn: { x: WORLD.nodes[0].x, y: WORLD.nodes[0].y, facing: "down" },
        nodes: WORLD.nodes,
        edges: WORLD.edges,
        startNode: 0,
        interactables,
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
      interactables = props.tables.slice(0, grid.length).map((t, i) => ({
        id: `table-${t.id}`,
        x: grid[i].x,
        y: grid[i].y,
        kind: "table" as const,
        tableLabel: t.name,
        highlight: t.id === props.myTableId,
        // "!" flutuante sobre a MINHA mesa (vira "✓" ao encontrar) — item 29
        glyph: t.id === props.myTableId ? (progress.phase3 ? "check" : "bang") : undefined,
        done: t.id === props.myTableId && progress.phase3,
        radius: 70,
      }));
      npcs = [
        { x: phase.anchors.brideStand.x, y: phase.anchors.brideStand.y, atlasUrl: props.brideAtlas, facing: "down" },
        { x: phase.anchors.groomStand.x, y: phase.anchors.groomStand.y, atlasUrl: props.groomAtlas, facing: "down" },
      ];
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
      overlays: phase.overlays,
      debug,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, atlasUrl, debug, spawnOverride, progress, unlocked, props.memories, props.tables, props.myTableId]);

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
        if (id.startsWith("table-")) {
          const tid = id.slice(6);
          const t = props.tables.find((x) => x.id === tid);
          if (!t) return;
          const mine = tid === props.myTableId;
          setTableMsg({ name: t.name, mine });
          setDialog("table");
          if (mine && !progress.phase3) {
            const next = { ...progress, phase3: true };
            setProgress(next);
            persist(next);
          }
        }
        return;
      }
    },
    [view, unlocked, progress, freeRoam, props.memories, props.tables, props.myTableId, persist, showToast],
  );

  const press = (key: keyof Controls, value: boolean) => {
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
    view === "grande-dia" && props.myTableId
      ? `Encontre sua mesa: ${props.tables.find((t) => t.id === props.myTableId)?.name ?? ""}`
      : view === "grande-dia" && !props.myTableId
        ? "Sua mesa será definida em breve"
        : view === "bosque"
          ? `Memórias: ${progress.memoriesSeen.length}/${props.memories.length}`
          : null;

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
                <span className="truncate font-semibold">{near.label}</span>
                <span className="shrink-0 text-neutral-300">· aperte</span>
                <kbd className="shrink-0 rounded bg-neutral-700 px-1.5 py-0.5 text-xs">{isTouch ? "A" : "⏎"}</kbd>
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
            <button
              type="button"
              aria-label="Interagir"
              onPointerDown={() => {
                controls.current.interact = true;
              }}
              className="absolute bottom-10 right-6 flex size-16 select-none flex-col items-center justify-center rounded-full border border-emerald-300/70 bg-emerald-600/40 text-xs font-bold text-white shadow-md backdrop-blur-sm transition active:scale-95 active:bg-emerald-600/90"
              style={{ bottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))" }}
            >
              <MessageSquare className="size-5" aria-hidden />
              Entrar
            </button>
          </>
        )}
      </div>

      {/* ── Diálogos ── */}
      {dialog === "npc" && (
        <DialogBox title="Recepcionista" onClose={() => setDialog(null)}>
          {isVisitor ? (
            recadoSent ? (
              <>
                <p className="text-sm">
                  Que carinho, {playerName}! Seu recado foi guardado para {coupleNames}. A festa toda está liberada —
                  aproveite cada fase!
                </p>
                <DialogActions>
                  <PrimaryBtn onClick={() => setDialog(null)}>
                    <Check className="mr-1 inline size-4" aria-hidden /> Oba!
                  </PrimaryBtn>
                </DialogActions>
              </>
            ) : (
              <>
                <p className="text-sm">
                  Olá, {playerName}! Visitantes não confirmam presença, mas que tal deixar um carinho para {coupleNames}?
                  Você já pode explorar todas as fases.
                </p>
                <textarea
                  value={recadoText}
                  onChange={(e) => setRecadoText(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Escreva seu recado para os noivos…"
                  className="mt-2 w-full resize-none rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-400 focus:outline-none"
                />
                <DialogActions>
                  <GhostBtn onClick={() => setDialog(null)}>Agora não</GhostBtn>
                  <PrimaryBtn disabled={recadoSending || !recadoText.trim()} onClick={sendRecado}>
                    {recadoSending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Check className="size-4" aria-hidden />
                    )}
                    Enviar recado
                  </PrimaryBtn>
                </DialogActions>
              </>
            )
          ) : progress.phase1 ? (
            <>
              <p className="text-sm">
                Sua presença já está confirmada, {playerName}! Atravesse o portão de flores à direita para seguir
                viagem.
              </p>
              <DialogActions>
                <PrimaryBtn onClick={() => setDialog(null)}>
                  <Check className="mr-1 inline size-4" aria-hidden /> Oba!
                </PrimaryBtn>
              </DialogActions>
            </>
          ) : (
            <>
              <p className="text-sm">
                Bem-vindo(a) à Vila, {playerName}! Para liberar o resto da festa, primeiro confirme sua presença. Vamos
                lá?
              </p>
              <DialogActions>
                <GhostBtn onClick={() => setDialog(null)}>Agora não</GhostBtn>
                <PrimaryBtn
                  disabled={goingToRsvp}
                  onClick={() => {
                    setGoingToRsvp(true);
                    router.push(`/${slug}/rsvp`);
                  }}
                >
                  {goingToRsvp ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
                  Confirmar presença
                </PrimaryBtn>
              </DialogActions>
            </>
          )}
        </DialogBox>
      )}

      {dialog === "memory" && activeMemory && (
        <DialogBox title={activeMemory.dateLabel ?? "Memória"} onClose={() => setDialog(null)}>
          <div className="flex flex-col gap-2">
            {activeMemory.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeMemory.photoUrl}
                alt={activeMemory.title}
                className="max-h-48 w-full rounded-lg object-cover"
              />
            )}
            <p className="text-base font-semibold text-emerald-200">{activeMemory.title}</p>
            {activeMemory.description && <p className="text-sm text-neutral-200">{activeMemory.description}</p>}
          </div>
          <DialogActions>
            <PrimaryBtn onClick={() => setDialog(null)}>Continuar</PrimaryBtn>
          </DialogActions>
        </DialogBox>
      )}

      {dialog === "table" && tableMsg && (
        <DialogBox title={tableMsg.name} onClose={() => setDialog(null)}>
          {tableMsg.mine ? (
            <p className="text-sm">
              Encontrou seu lugar, {playerName}!{" "}
              {props.coupleMessage ?? `${coupleNames} agradecem de coração por você estar aqui neste dia.`}
            </p>
          ) : props.myTableId ? (
            <p className="text-sm">Essa não é a sua mesa — siga o brilho dourado até a sua.</p>
          ) : (
            <p className="text-sm">Sua mesa será definida em breve. Fique à vontade para explorar o salão!</p>
          )}
          <DialogActions>
            <PrimaryBtn onClick={() => setDialog(null)}>Fechar</PrimaryBtn>
          </DialogActions>
        </DialogBox>
      )}

      {dialog === "credits" && <CreditsOverlay onClose={() => setDialog(null)} />}
    </div>
  );
}

// ─── Componentes de UI ───
function DialogBox({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center p-3">
      <div className="w-full max-w-xl rounded-xl border-2 border-neutral-600 bg-neutral-800/97 p-4 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-emerald-300">{title}</p>
          <button onClick={onClose} aria-label="Fechar" className="text-neutral-400 hover:text-white">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function DialogActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 flex justify-end gap-2">{children}</div>;
}
function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
    >
      {children}
    </button>
  );
}
function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg bg-neutral-700 px-4 py-2 text-sm hover:bg-neutral-600">
      {children}
    </button>
  );
}

function CreditsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl border border-neutral-600 bg-neutral-800 p-5 text-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Créditos</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-neutral-400 hover:text-white">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <p className="mb-3 text-neutral-300">
          Arte dos personagens derivada do <strong>LPC (Liberated Pixel Cup)</strong> — peças sob CC-BY, CC-BY-SA ou
          OGA-BY. Motor <strong>Phaser 3</strong> (MIT).
        </p>
        <ul className="space-y-1.5 text-neutral-300">
          <li>Stephen Challener (Redshrike)</li>
          <li>Johannes Sjölund (wulax)</li>
          <li>Eliza Wyatt (ElizaWy)</li>
          <li>JaidynReiman</li>
          <li>Benjamin K. Smith (BenCreating)</li>
          <li>bluecarrot16, Matthew Krohn (makrohn)</li>
          <li>Manuel Riecke (MrBeast), Nila122</li>
          <li>Thane Brimhall (pennomi), laetissima, kheftel</li>
          <li>Carlo Enrico Victoria (Nemisys)</li>
        </ul>
        <p className="mt-3 text-xs text-neutral-400">
          Lista completa de peças e licenças em <code>docs/ASSETS-LICENSES.md</code>. Mapas: arte do projeto Voem.
        </p>
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
