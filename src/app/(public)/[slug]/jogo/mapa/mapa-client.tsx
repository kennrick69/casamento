"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import type { Controls } from "./game-canvas";

// Phaser roda só no cliente (sem SSR). ssr:false exige estar dentro de um Client
// Component (regra do Next 16 — ver node_modules/next/dist/docs lazy-loading).
const GameCanvas = dynamic(() => import("./game-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-neutral-400">
      <Loader2 className="size-6 animate-spin" aria-hidden /> <span className="ml-2 text-sm">Carregando a festa…</span>
    </div>
  ),
});

export function MapaClient({
  slug,
  coupleNames,
  playerName,
  atlasUrl,
  isVisitor,
  rsvpConfirmed,
}: {
  slug: string;
  coupleNames: string;
  playerName: string;
  atlasUrl: string;
  isVisitor: boolean;
  rsvpConfirmed: boolean;
}) {
  const router = useRouter();
  const controls = useRef<Controls>({ up: false, down: false, left: false, right: false, interact: false });
  const [near, setNear] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [goingToRsvp, setGoingToRsvp] = useState(false);

  const press = (key: keyof Controls, value: boolean) => {
    controls.current[key] = value;
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-900 text-neutral-100">
      {/* Barra superior */}
      <header className="flex items-center justify-between gap-2 px-4 py-2">
        <Link href={`/${slug}/jogo`} className="inline-flex items-center gap-1 text-sm text-neutral-300 hover:text-white">
          <ArrowLeft className="size-4" aria-hidden /> Sair
        </Link>
        <span className="truncate text-sm font-semibold">{coupleNames}</span>
        <span className="w-12" />
      </header>

      {/* Palco do jogo */}
      <div className="relative mx-auto w-full max-w-xl flex-1 px-2">
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl border border-neutral-700 bg-[#6b8f4e] shadow-inner">
          <GameCanvas
            atlasUrl={atlasUrl}
            controls={controls}
            onNearChange={setNear}
            onInteract={() => setDialog(true)}
          />

          {/* Dica de proximidade */}
          {near && !dialog && (
            <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-md bg-black/70 px-3 py-1 text-xs">
              Aperte <kbd className="rounded bg-neutral-700 px-1">⏎</kbd> /{" "}
              <kbd className="rounded bg-neutral-700 px-1">A</kbd> para falar
            </div>
          )}

          {/* Controles touch */}
          <div className="absolute bottom-3 left-3 select-none">
            <DPad onPress={press} />
          </div>
          <button
            type="button"
            aria-label="Interagir"
            onPointerDown={() => {
              controls.current.interact = true;
            }}
            className="absolute bottom-6 right-5 size-16 select-none rounded-full border-2 border-emerald-300 bg-emerald-600/90 text-xl font-bold text-white active:scale-95"
          >
            A
          </button>
        </div>
      </div>

      {/* Caixa de diálogo clássica */}
      {dialog && (
        <div className="fixed inset-x-0 bottom-0 z-10 flex justify-center p-3">
          <div className="w-full max-w-xl rounded-xl border-2 border-neutral-600 bg-neutral-800/95 p-4 shadow-2xl">
            <p className="mb-1 text-xs uppercase tracking-wider text-emerald-300">Recepcionista</p>
            {isVisitor ? (
              <>
                <p className="text-sm">
                  Olá, {playerName}! Que bom te ver por aqui. Visitantes não confirmam presença — mas fique à vontade
                  para explorar a festa de {coupleNames}. 💛
                </p>
                <div className="mt-3 flex justify-end">
                  <button onClick={() => setDialog(false)} className="rounded-lg bg-neutral-700 px-4 py-2 text-sm hover:bg-neutral-600">
                    Fechar
                  </button>
                </div>
              </>
            ) : rsvpConfirmed ? (
              <>
                <p className="text-sm">
                  Sua presença já está confirmada, {playerName}! 🎉 Seja muito bem-vindo(a) à festa de {coupleNames}.
                </p>
                <div className="mt-3 flex justify-end">
                  <button onClick={() => setDialog(false)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">
                    <Check className="mr-1 inline size-4" aria-hidden /> Oba!
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm">
                  Bem-vindo(a) à recepção, {playerName}! Para liberar o resto da festa, primeiro confirme sua presença.
                  Vamos lá?
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setDialog(false)} className="rounded-lg bg-neutral-700 px-4 py-2 text-sm hover:bg-neutral-600">
                    Agora não
                  </button>
                  <button
                    disabled={goingToRsvp}
                    onClick={() => {
                      setGoingToRsvp(true);
                      router.push(`/${slug}/rsvp`);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {goingToRsvp ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
                    Confirmar presença
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// D-pad de 4 direções para toque. Pointer events cobrem toque e mouse; soltar
// o dedo (up/leave/cancel) zera a direção.
function DPad({ onPress }: { onPress: (key: keyof Controls, value: boolean) => void }) {
  const btn =
    "flex size-12 items-center justify-center rounded-lg border border-neutral-500 bg-neutral-700/80 text-lg text-white active:bg-neutral-600";
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
