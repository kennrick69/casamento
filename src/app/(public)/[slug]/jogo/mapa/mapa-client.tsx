"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Info, MapPin, X, Lock } from "lucide-react";
import { WORLD, PHASES, tableGrid, type LevelId } from "@/lib/game/world";
import type { Controls, Interactable, SceneConfig, NpcAvatar } from "./game-canvas";

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
  const [toast, setToast] = useState<string | null>(null);

  const unlocked = useMemo(
    () => ({
      vila: true,
      bosque: progress.phase1,
      "grande-dia": progress.phase2,
    }),
    [progress.phase1, progress.phase2],
  );

  // Lê ?debug=1 e ?start=<fase> só no cliente (deep-link / ferramenta de dev).
  // ?start só pula para fases já desbloqueadas; senão fica no mapa.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q.get("debug") === "1") setDebug(true);
    const start = q.get("start") as LevelId | null;
    if (start && (start === "vila" || start === "bosque" || start === "grande-dia") && unlocked[start]) {
      setView(start);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        { id: "npc", x: phase.anchors.npc.x, y: phase.anchors.npc.y, kind: "npc", glyph: "mail", label: "Recepcionista" },
        {
          id: "gate",
          x: phase.anchors.gate.x,
          y: phase.anchors.gate.y,
          kind: "gate",
          glyph: progress.phase1 ? "flower" : "lock",
          locked: !progress.phase1,
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
        glyph: progress.memoriesSeen.includes(mem.id) ? "check" : "book",
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
      spawn: phase.spawn,
      collisionUrl: phase.collision,
      interactables,
      npcs,
      debug,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, atlasUrl, debug, progress, unlocked, props.memories, props.tables, props.myTableId]);

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
        if (id === "gate" && progress.phase1) {
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
    [view, unlocked, progress, props.memories, props.tables, props.myTableId, persist, showToast],
  );

  const press = (key: keyof Controls, value: boolean) => {
    controls.current[key] = value;
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

        {/* Dica de proximidade (rótulo legível — item 19) */}
        {near && !dialog && (
          <div className="pointer-events-none absolute left-1/2 top-3 flex max-w-[92%] -translate-x-1/2 items-center gap-2 rounded-lg bg-black/80 px-4 py-2 text-center text-sm shadow-lg">
            {near.locked ? (
              <>
                <Lock className="size-4 shrink-0 text-neutral-300" aria-hidden />
                <span className="font-semibold">{near.label}</span>
                <span className="text-neutral-400">— bloqueado</span>
              </>
            ) : (
              <>
                <span className="font-semibold">{near.label}</span>
                <span className="text-neutral-300">· aperte</span>
                <kbd className="rounded bg-neutral-700 px-1.5 py-0.5 text-xs">{isTouch ? "A" : "⏎"}</kbd>
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
              className="absolute bottom-10 right-6 size-20 select-none rounded-full border-2 border-emerald-300 bg-emerald-600/90 text-2xl font-bold text-white shadow-lg active:scale-95"
              style={{ bottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))" }}
            >
              A
            </button>
          </>
        )}
      </div>

      {/* ── Diálogos ── */}
      {dialog === "npc" && (
        <DialogBox title="Recepcionista" onClose={() => setDialog(null)}>
          {isVisitor ? (
            <>
              <p className="text-sm">
                Olá, {playerName}! Visitantes não confirmam presença — mas fique à vontade para explorar a festa de{" "}
                {coupleNames}.
              </p>
              <DialogActions>
                <GhostBtn onClick={() => setDialog(null)}>Fechar</GhostBtn>
              </DialogActions>
            </>
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
  const btn =
    "flex size-14 items-center justify-center rounded-lg border border-neutral-400 bg-neutral-700/85 text-2xl text-white shadow-md active:bg-emerald-600 touch-none";
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
