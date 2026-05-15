'use client';

/* eslint-disable react-hooks/set-state-in-effect --
 * Esta máquina de estados depende de gatilhos externos (mudança da
 * media query prefers-reduced-motion + prop `trigger`) e precisa
 * disparar setState() de dentro de useEffect ao reagir a esses eventos.
 * É o caso clássico de "sync external system into React state" que a
 * regra cobre por engano. */

/**
 * HeartFlightTransition
 * ----------------------
 * Sequência: mãos unidas → coração nasce → coração funde com o céu → voo horizontal (loop).
 *
 * Estados (state machine linear):
 *   IDLE          → aguardando trigger externo (ex: drag completo das mãos)
 *   UNION_PAUSE   → 200ms de respiração após união
 *   HEART_BIRTH   → coração faz pop (scale 0 → 1.5, bounce easing)
 *   HEART_GROWTH  → coração cresce e muda cor (rosa → pêssego)
 *   HEART_MERGE   → coração explode (scale → 40), já com cor do céu
 *   SKY_CROSSFADE → cena de queda some, cena de voo aparece
 *   FLYING        → loop infinito do casal voando
 *
 * Uso:
 *   <HeartFlightTransition
 *     trigger={handsUnited}
 *     fallingScene={<YourFallingGifs />}
 *     flyingScene={<YourFlyingVideo />}
 *     onFlightStart={() => setShowInviteButton(true)}
 *   />
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ============================================================================
// Configuração — fácil de tunar sem mexer na lógica
// ============================================================================

const TIMING = {
  unionPause: 200,
  heartBirth: 400,
  heartGrowth: 500,
  heartMerge: 300,
  skyCrossfade: 400,
  heartFadeOut: 200,
} as const;

// IMPORTANTE: ajustar SKY_TARGET_COLOR pra cor dominante do céu do voo
// depois que você gerar o vídeo final. Pegue um pixel central da imagem.
const COLORS = {
  heartStart: '#FF6B9D',    // rosa coral vibrante
  heartMid: '#FFB088',      // pêssego médio
  heartEnd: '#FFD4B8',      // cor-alvo: deve casar com SKY_TARGET_COLOR
  skyTarget: '#FFD4B8',     // cor central do céu do voo (ajustar!)
} as const;

type Phase =
  | 'IDLE'
  | 'UNION_PAUSE'
  | 'HEART_BIRTH'
  | 'HEART_GROWTH'
  | 'HEART_MERGE'
  | 'SKY_CROSSFADE'
  | 'FLYING';

interface HeartFlightTransitionProps {
  /** Quando vira true, dispara a sequência inteira. */
  trigger: boolean;
  /** Cena de queda livre (GIFs do casal). Pode ser qualquer ReactNode. */
  fallingScene: React.ReactNode;
  /** Cena de voo horizontal (vídeo loop ou GIF). */
  flyingScene: React.ReactNode;
  /** Callback quando o estado FLYING começa (ex: pra mostrar botão de convite). */
  onFlightStart?: () => void;
  /** Callback opcional pra debug ou analytics em cada mudança de fase. */
  onPhaseChange?: (phase: Phase) => void;
  /** Origem do coração relativo ao container (default: centro). */
  heartOrigin?: { x: string; y: string };
}

// ============================================================================
// Hook: respeita prefers-reduced-motion
// ============================================================================

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

// ============================================================================
// Componente principal
// ============================================================================

export default function HeartFlightTransition({
  trigger,
  fallingScene,
  flyingScene,
  onFlightStart,
  onPhaseChange,
  heartOrigin = { x: '50%', y: '42%' },
}: HeartFlightTransitionProps) {
  const [phase, setPhase] = useState<Phase>('IDLE');
  const reducedMotion = useReducedMotion();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timers.current.push(id);
  }, []);

  const setPhaseWithCallback = useCallback(
    (next: Phase) => {
      setPhase(next);
      onPhaseChange?.(next);
      if (next === 'FLYING') onFlightStart?.();
    },
    [onPhaseChange, onFlightStart]
  );

  // Dispara a sequência quando trigger vira true
  useEffect(() => {
    if (!trigger || phase !== 'IDLE') return;

    if (reducedMotion) {
      // Modo acessível: fade simples direto pro voo
      setPhaseWithCallback('SKY_CROSSFADE');
      schedule(() => setPhaseWithCallback('FLYING'), 400);
      return;
    }

    setPhaseWithCallback('UNION_PAUSE');
    let t = TIMING.unionPause;

    schedule(() => setPhaseWithCallback('HEART_BIRTH'), t);
    t += TIMING.heartBirth;

    schedule(() => setPhaseWithCallback('HEART_GROWTH'), t);
    t += TIMING.heartGrowth;

    schedule(() => setPhaseWithCallback('HEART_MERGE'), t);
    t += TIMING.heartMerge;

    schedule(() => setPhaseWithCallback('SKY_CROSSFADE'), t);
    t += TIMING.skyCrossfade;

    schedule(() => setPhaseWithCallback('FLYING'), t);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Derived: opacidades e transforms de cada camada
  const fallingOpacity =
    phase === 'SKY_CROSSFADE' || phase === 'FLYING' ? 0 : 1;
  const flyingOpacity =
    phase === 'SKY_CROSSFADE' || phase === 'FLYING' ? 1 : 0;

  const heartState = getHeartState(phase);

  return (
    <div
      role="presentation"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Camada 0: cena de voo (base, fica por baixo) */}
      <div
        aria-hidden={phase !== 'FLYING'}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: flyingOpacity,
          transition: `opacity ${TIMING.skyCrossfade}ms ease`,
          willChange: 'opacity',
        }}
      >
        {flyingScene}
      </div>

      {/* Camada 1: cena de queda livre (em cima do voo) */}
      <div
        aria-hidden={phase === 'FLYING'}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: fallingOpacity,
          transition: `opacity ${TIMING.skyCrossfade}ms ease`,
          willChange: 'opacity',
        }}
      >
        {fallingScene}
      </div>

      {/* Camada 2: coração */}
      <Heart origin={heartOrigin} state={heartState} />

      {/* Anúncio acessível pra screen readers */}
      <div
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      >
        {phase === 'FLYING' && 'O casal está voando feliz.'}
      </div>
    </div>
  );
}

// ============================================================================
// Componente Heart
// ============================================================================

interface HeartState {
  scale: number;
  opacity: number;
  fill: string;
  easing: string;
  duration: number;
}

function getHeartState(phase: Phase): HeartState {
  switch (phase) {
    case 'IDLE':
    case 'UNION_PAUSE':
      return {
        scale: 0,
        opacity: 0,
        fill: COLORS.heartStart,
        easing: 'ease',
        duration: 0,
      };
    case 'HEART_BIRTH':
      return {
        scale: 1.5,
        opacity: 1,
        fill: COLORS.heartStart,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // overshoot/bounce
        duration: TIMING.heartBirth,
      };
    case 'HEART_GROWTH':
      return {
        scale: 8,
        opacity: 1,
        fill: COLORS.heartMid,
        easing: 'ease-in',
        duration: TIMING.heartGrowth,
      };
    case 'HEART_MERGE':
      return {
        scale: 40,
        opacity: 1,
        fill: COLORS.heartEnd,
        easing: 'ease-out',
        duration: TIMING.heartMerge,
      };
    case 'SKY_CROSSFADE':
      return {
        scale: 40,
        opacity: 0,
        fill: COLORS.heartEnd,
        easing: 'ease',
        duration: TIMING.heartFadeOut,
      };
    case 'FLYING':
      return {
        scale: 0,
        opacity: 0,
        fill: COLORS.heartEnd,
        easing: 'ease',
        duration: 0,
      };
  }
}

interface HeartProps {
  origin: { x: string; y: string };
  state: HeartState;
}

function Heart({ origin, state }: HeartProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: origin.x,
        top: origin.y,
        width: 80,
        height: 80,
        pointerEvents: 'none',
        transform: `translate(-50%, -50%) scale(${state.scale})`,
        opacity: state.opacity,
        transition: `transform ${state.duration}ms ${state.easing}, opacity ${state.duration}ms ease`,
        willChange: 'transform, opacity',
      }}
    >
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <path
          d="M50 88 C20 65, 10 40, 25 25 C35 15, 45 20, 50 32 C55 20, 65 15, 75 25 C90 40, 80 65, 50 88 Z"
          fill={state.fill}
          style={{
            transition: `fill ${state.duration}ms ease-in`,
          }}
        />
      </svg>
    </div>
  );
}

// ============================================================================
// Exemplo de uso (apagar quando integrar):
// ============================================================================

// const [handsUnited, setHandsUnited] = useState(false);
//
// <HeartFlightTransition
//   trigger={handsUnited}
//   fallingScene={
//     <div style={{ position: 'relative', width: '100%', height: '100%' }}>
//       <img src="/leticia.gif" alt="Letícia" style={{ position: 'absolute', left: '30%', top: '40%' }} />
//       <img src="/jose.gif" alt="José" style={{ position: 'absolute', right: '30%', top: '40%' }} />
//     </div>
//   }
//   flyingScene={
//     <video
//       src="/casal-voando.mp4"
//       autoPlay
//       loop
//       muted
//       playsInline
//       style={{ width: '100%', height: '100%', objectFit: 'cover' }}
//     />
//   }
//   onFlightStart={() => {
//     // Mostrar botão "Você é digno deste convite"
//     setTimeout(() => setShowInviteButton(true), 800);
//   }}
//   onPhaseChange={(phase) => {
//     console.log('Phase:', phase);
//     // ou: analytics.track('heart_transition', { phase });
//   }}
// />
