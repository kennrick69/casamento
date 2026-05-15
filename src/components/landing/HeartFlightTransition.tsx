'use client';

/* eslint-disable react-hooks/set-state-in-effect --
 * Esta máquina de estados usa async/await dentro de useEffect para
 * orquestrar steps discretos (BIRTH → BEAT → POWER_UP → SNAP).
 * É o caso clássico de "sync external system into React state" que a
 * regra cobre por engano. O mesmo disable existia na v1. */

/**
 * HeartFlightTransition (v2 — pixel art)
 * ---------------------------------------
 * Sequência Mario power-up:
 *   1. UNION_PAUSE   — pausa de respiração após mãos unidas
 *   2. HEART_BIRTH   — coração nasce em 3 steps discretos (scale 1 → 1.5 → 1)
 *   3. HEART_BEAT    — bate 3 vezes (ritmo de coração)
 *   4. POWER_UP_GROW — cresce em 6 steps discretos, cor cicla por 5 paletas
 *   5. SNAP_FLYING   — 1 frame: coração some, cena de queda some,
 *                      cena de voo aparece, partículas explodem
 *
 * Mudanças vs v1:
 *   - Coração SVG pixel 16-bit (15×13 px, 3 cores) com shape-rendering crispEdges
 *   - Crescimento em steps discretos (sem easing contínuo) — vibe retrô
 *   - Ciclo de cores power-up: vermelho → dourado → teal → roxo → rosa
 *   - Transição final é SNAP (1 frame), não crossfade
 *   - Partículas pixel explodem no snap (decorativas, não bloqueiam)
 *
 * Tempo total: ~1.6s do trigger até FLYING.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ============================================================================
// Configuração — fácil de tunar sem mexer na lógica
// ============================================================================

const TIMING = {
  unionPause: 200,
  popStep: 80,        // cada step do "nascimento" (3 steps)
  beatExpand: 120,    // duração da expansão de cada batida
  beatContract: 180,  // duração da contração de cada batida
  beatCount: 3,
  growStep: 110,      // cada step do "power-up grow" (6 steps)
  particleDuration: 600,
} as const;

// 5 paletas que ciclam no power-up grow
// (Mario power-up: vermelho → dourado → teal → roxo → rosa final)
const POWER_UP_PALETTES = [
  { dark: '#C71B2E', mid: '#FF3B5C', light: '#FFB3C0' }, // vermelho clássico
  { dark: '#B8860B', mid: '#FFD700', light: '#FFF59D' }, // dourado
  { dark: '#0B7B5F', mid: '#22D3A8', light: '#A7F3D0' }, // teal
  { dark: '#6B21A8', mid: '#A855F7', light: '#E9D5FF' }, // roxo
  { dark: '#A04050', mid: '#FFB8C8', light: '#FFE0E8' }, // rosa final
] as const;

// Steps do power-up grow — cada um define scale e índice da paleta
const GROW_STEPS = [
  { scale: 2,  paletteIdx: 0 },
  { scale: 4,  paletteIdx: 1 },
  { scale: 8,  paletteIdx: 2 },
  { scale: 14, paletteIdx: 3 },
  { scale: 22, paletteIdx: 4 },
  { scale: 32, paletteIdx: 4 }, // mantém última cor, atinge fullscreen
] as const;

const PARTICLE_COLORS = ['#FF3B5C', '#FFD700', '#22D3A8', '#A855F7', '#FFB3C0'] as const;
const PARTICLE_COUNT = 32;

type Phase =
  | 'IDLE'
  | 'UNION_PAUSE'
  | 'HEART_BIRTH'
  | 'HEART_BEAT'
  | 'POWER_UP_GROW'
  | 'SNAP_FLYING';

interface HeartFlightTransitionProps {
  trigger: boolean;
  fallingScene: React.ReactNode;
  flyingScene: React.ReactNode;
  onFlightStart?: () => void;
  onPhaseChange?: (phase: Phase) => void;
  heartOrigin?: { x: string; y: string };
}

// ============================================================================
// Hook: prefers-reduced-motion
// ============================================================================

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
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
  const [heartScale, setHeartScale] = useState(0);
  const [heartOpacity, setHeartOpacity] = useState(0);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);

  const reducedMotion = useReducedMotion();
  const cancelledRef = useRef(false);

  const setPhaseWithCallback = useCallback(
    (next: Phase) => {
      setPhase(next);
      onPhaseChange?.(next);
      if (next === 'SNAP_FLYING') onFlightStart?.();
    },
    [onPhaseChange, onFlightStart]
  );

  const spawnParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const distance = 100 + Math.random() * 180;
      newParticles.push({
        id: `${Date.now()}-${i}`,
        angle,
        distance,
        scale: 0.5 + Math.random() * 1.5,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      });
    }
    setParticles(newParticles);
    setTimeout(() => setParticles([]), TIMING.particleDuration + 100);
  }, []);

  // Dispara a sequência quando trigger vira true
  useEffect(() => {
    if (!trigger || phase !== 'IDLE') return;

    if (reducedMotion) {
      setPhaseWithCallback('SNAP_FLYING');
      return;
    }

    cancelledRef.current = false;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    const run = async () => {
      // 1. UNION_PAUSE
      setPhaseWithCallback('UNION_PAUSE');
      await wait(TIMING.unionPause);
      if (cancelledRef.current) return;

      // 2. HEART_BIRTH — 3 steps discretos
      setPhaseWithCallback('HEART_BIRTH');
      setHeartOpacity(1);
      setPaletteIdx(0);

      for (const scale of [1, 1.5, 1]) {
        setHeartScale(scale);
        await wait(TIMING.popStep);
        if (cancelledRef.current) return;
      }

      // 3. HEART_BEAT — 3 batidas
      setPhaseWithCallback('HEART_BEAT');
      for (let i = 0; i < TIMING.beatCount; i++) {
        setHeartScale(1.3);
        await wait(TIMING.beatExpand);
        if (cancelledRef.current) return;
        setHeartScale(1);
        await wait(TIMING.beatContract);
        if (cancelledRef.current) return;
      }

      // 4. POWER_UP_GROW — 6 steps com cor mudando
      setPhaseWithCallback('POWER_UP_GROW');
      for (const step of GROW_STEPS) {
        setHeartScale(step.scale);
        setPaletteIdx(step.paletteIdx);
        await wait(TIMING.growStep);
        if (cancelledRef.current) return;
      }

      // 5. SNAP_FLYING — instantâneo
      setPhaseWithCallback('SNAP_FLYING');
      setHeartOpacity(0);
      spawnParticles();
    };

    void run();

    return () => {
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const currentPalette = POWER_UP_PALETTES[paletteIdx];
  const isFlying = phase === 'SNAP_FLYING';

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
      {/* Camada 0: cena de voo */}
      <div
        aria-hidden={!isFlying}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: isFlying ? 1 : 0,
          // Sem transition: snap instantâneo
        }}
      >
        {flyingScene}
      </div>

      {/* Camada 1: cena de queda */}
      <div
        aria-hidden={isFlying}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: isFlying ? 0 : 1,
          // Sem transition: snap instantâneo
        }}
      >
        {fallingScene}
      </div>

      {/* Camada 2: coração pixel */}
      <PixelHeart
        origin={heartOrigin}
        scale={heartScale}
        opacity={heartOpacity}
        palette={currentPalette}
      />

      {/* Camada 3: partículas pixel */}
      {particles.map((p) => (
        <PixelParticle key={p.id} particle={p} origin={heartOrigin} />
      ))}

      {/* Anúncio acessível */}
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
        {isFlying && 'O casal está voando feliz.'}
      </div>
    </div>
  );
}

// ============================================================================
// PixelHeart — sprite 16-bit (15×13 px, 3 cores)
// ============================================================================

interface PixelHeartProps {
  origin: { x: string; y: string };
  scale: number;
  opacity: number;
  palette: { dark: string; mid: string; light: string };
}

function PixelHeart({ origin, scale, opacity, palette }: PixelHeartProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: origin.x,
        top: origin.y,
        width: 60,
        height: 52,
        pointerEvents: 'none',
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        // CRÍTICO: sem transition na escala — queremos STEPS DISCRETOS
        willChange: 'transform, opacity',
      }}
    >
      <svg
        width="60"
        height="52"
        viewBox="0 0 15 13"
        shapeRendering="crispEdges"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          display: 'block',
          imageRendering: 'pixelated',
        }}
      >
        {/* Borda escura (outline) */}
        <g fill={palette.dark}>
          <rect x="2" y="0" width="4" height="1" />
          <rect x="9" y="0" width="4" height="1" />
          <rect x="1" y="1" width="1" height="1" />
          <rect x="6" y="1" width="3" height="1" />
          <rect x="13" y="1" width="1" height="1" />
          <rect x="0" y="2" width="1" height="3" />
          <rect x="14" y="2" width="1" height="3" />
          <rect x="0" y="5" width="2" height="1" />
          <rect x="13" y="5" width="2" height="1" />
          <rect x="1" y="6" width="2" height="1" />
          <rect x="12" y="6" width="2" height="1" />
          <rect x="2" y="7" width="2" height="1" />
          <rect x="11" y="7" width="2" height="1" />
          <rect x="3" y="8" width="2" height="1" />
          <rect x="10" y="8" width="2" height="1" />
          <rect x="4" y="9" width="2" height="1" />
          <rect x="9" y="9" width="2" height="1" />
          <rect x="5" y="10" width="2" height="1" />
          <rect x="8" y="10" width="2" height="1" />
          <rect x="6" y="11" width="3" height="1" />
          <rect x="7" y="12" width="1" height="1" />
        </g>
        {/* Preenchimento médio */}
        <g fill={palette.mid}>
          <rect x="2" y="1" width="4" height="1" />
          <rect x="9" y="1" width="4" height="1" />
          <rect x="1" y="2" width="13" height="3" />
          <rect x="2" y="5" width="11" height="1" />
          <rect x="3" y="6" width="9" height="1" />
          <rect x="4" y="7" width="7" height="1" />
          <rect x="5" y="8" width="5" height="1" />
          <rect x="6" y="9" width="3" height="1" />
          <rect x="7" y="10" width="1" height="1" />
        </g>
        {/* Highlight (brilho) */}
        <g fill={palette.light}>
          <rect x="2" y="2" width="2" height="1" />
          <rect x="3" y="3" width="1" height="1" />
          <rect x="9" y="2" width="1" height="1" />
        </g>
      </svg>
    </div>
  );
}

// ============================================================================
// PixelParticle — quadradinho pixel que voa em direção polar
// ============================================================================

interface Particle {
  id: string;
  angle: number;
  distance: number;
  scale: number;
  color: string;
}

interface PixelParticleProps {
  particle: Particle;
  origin: { x: string; y: string };
}

function PixelParticle({ particle, origin }: PixelParticleProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const tx = Math.cos(particle.angle) * particle.distance;
  const ty = Math.sin(particle.angle) * particle.distance;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: origin.x,
        top: origin.y,
        width: 8,
        height: 8,
        background: particle.color,
        pointerEvents: 'none',
        transform: animated
          ? `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${particle.scale})`
          : 'translate(-50%, -50%) scale(1)',
        opacity: animated ? 0 : 1,
        transition: `transform ${TIMING.particleDuration}ms cubic-bezier(0.2, 0.6, 0.4, 1), opacity ${TIMING.particleDuration}ms ease-out`,
        willChange: 'transform, opacity',
        imageRendering: 'pixelated',
      }}
    />
  );
}

// ============================================================================
// Exemplo de uso:
// ============================================================================

// const [handsUnited, setHandsUnited] = useState(false);
//
// <HeartFlightTransition
//   trigger={handsUnited}
//   fallingScene={
//     <FallingScene onHandsUnited={() => setHandsUnited(true)} />
//   }
//   flyingScene={
//     <FlyingScene
//       src="/landing/casal-voando-transparente.gif"
//       backgroundColor="#FFD4B8"
//     />
//   }
//   onFlightStart={() => {
//     setTimeout(() => setShowInviteBtn(true), 800);
//   }}
// />
