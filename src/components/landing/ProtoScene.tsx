'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlyingScene } from './FlyingScene';

type SceneState = 'falling' | 'flying' | 'failed';

type HeartPhase = 'IDLE' | 'BIRTH' | 'BEAT' | 'POWER_UP' | 'SNAP';

const TIMING = {
  popStep: 80,
  beatExpand: 120,
  beatContract: 180,
  beatCount: 3,
  growStep: 110,
  particleDuration: 600,
} as const;

const POWER_UP_PALETTES = [
  { dark: '#C71B2E', mid: '#FF3B5C', light: '#FFB3C0' },
  { dark: '#B8860B', mid: '#FFD700', light: '#FFF59D' },
  { dark: '#0B7B5F', mid: '#22D3A8', light: '#A7F3D0' },
  { dark: '#6B21A8', mid: '#A855F7', light: '#E9D5FF' },
  { dark: '#A04050', mid: '#FFB8C8', light: '#FFE0E8' },
] as const;

// Escala máxima ajustada ao canvas 380×580 do ProtoScene
// (v2 usa 32 para fullscreen; scale 7 cobre os 380px do container)
const GROW_STEPS_PROTO = [
  { scale: 1.5, paletteIdx: 0 },
  { scale: 2,   paletteIdx: 1 },
  { scale: 2.8, paletteIdx: 2 },
  { scale: 4,   paletteIdx: 3 },
  { scale: 5.5, paletteIdx: 4 },
  { scale: 7,   paletteIdx: 4 },
] as const;

const PARTICLE_COLORS = ['#FF3B5C', '#FFD700', '#22D3A8', '#A855F7', '#FFB3C0'] as const;
const PARTICLE_COUNT = 32;

interface Particle {
  id: string;
  angle: number;
  distance: number;
  scale: number;
  color: string;
}

function PixelHeart({
  scale,
  opacity,
  palette,
}: {
  scale: number;
  opacity: number;
  palette: { dark: string; mid: string; light: string };
}) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        top: '290px',
        width: 60,
        height: 52,
        pointerEvents: 'none',
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        willChange: 'transform, opacity',
        zIndex: 7,
      }}
    >
      <svg
        width="60"
        height="52"
        viewBox="0 0 15 13"
        shapeRendering="crispEdges"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', imageRendering: 'pixelated' }}
      >
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
        <g fill={palette.light}>
          <rect x="2" y="2" width="2" height="1" />
          <rect x="3" y="3" width="1" height="1" />
          <rect x="9" y="2" width="1" height="1" />
        </g>
      </svg>
    </div>
  );
}

function PixelParticle({ particle }: { particle: Particle }) {
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
        left: '50%',
        top: '290px',
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
        zIndex: 8,
        imageRendering: 'pixelated',
      }}
    />
  );
}

// Splash de água ao boneco bater na superfície. Duas camadas:
//  - principal: 14 gotinhas grandes, 40–110px de alcance, ~1000ms
//  - spray:      8 gotinhas pequenas, 90–160px de alcance, ~1300ms
// Renderizado condicionalmente após o fail().
function Splash({ x, y }: { x: number; y: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const drops = ref.current?.querySelectorAll<HTMLDivElement>('[data-drop]');
    if (!drops || drops.length === 0) return;
    const anims: Animation[] = [];
    drops.forEach((drop) => {
      const isSpray = drop.dataset.layer === 'spray';
      const angle = -Math.PI + Math.random() * Math.PI; // semicírculo superior
      const distance = isSpray
        ? 90 + Math.random() * 70
        : 40 + Math.random() * 70;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const a = drop.animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.3)`,
            opacity: 0,
          },
        ],
        {
          duration: isSpray ? 1300 : 1000,
          easing: 'ease-out',
          fill: 'forwards',
        }
      );
      anims.push(a);
    });
    return () => anims.forEach((a) => a.cancel());
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: y,
        left: x,
        pointerEvents: 'none',
        zIndex: 6,
      }}
    >
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={`main-${i}`}
          data-drop
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'rgba(220, 240, 255, 0.95)',
            boxShadow: '0 0 6px rgba(255,255,255,0.75)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`spray-${i}`}
          data-drop
          data-layer="spray"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: 'rgba(200, 230, 255, 0.85)',
            boxShadow: '0 0 4px rgba(255,255,255,0.6)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}

export function ProtoScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const brideRef = useRef<HTMLDivElement>(null);
  const groomRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLImageElement>(null);
  const cloud0Ref = useRef<HTMLImageElement>(null);
  const cloud1Ref = useRef<HTMLImageElement>(null);
  const cloud2Ref = useRef<HTMLImageElement>(null);
  const cloud3Ref = useRef<HTMLImageElement>(null);
  const pressStartRef = useRef<HTMLSpanElement>(null);

  const [state, setState] = useState<SceneState>('falling');
  const [timeLeft, setTimeLeft] = useState(15);
  const [showButton, setShowButton] = useState(false);
  const [showFailText, setShowFailText] = useState(false);
  // Transição do coração após união. Letícia/José fazem fade-out e o
  // casalvoando.gif aparece no centro. Cenário não é tocado.
  const [heartPhase, setHeartPhase] = useState<HeartPhase>('IDLE');
  const [heartScale, setHeartScale] = useState(0);
  const [heartOpacity, setHeartOpacity] = useState(0);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  // Após fail() o boneco "bate na água": dispara splash e sumiço.
  // Posições congeladas no momento do impacto para o componente Splash.
  const [brideFell, setBrideFell] = useState<{ x: number; y: number } | null>(
    null
  );
  const [groomFell, setGroomFell] = useState<{ x: number; y: number } | null>(
    null
  );

  const stateRef = useRef<SceneState>('falling');
  // José (groom) começa à esquerda em left=60. Letícia (bride) começa à direita
  // em right=60 — com largura 125 e container 380, left-effective = 380-125-60 = 195.
  const bridePos = useRef({ x: 195, y: 220 });
  const groomPos = useRef({ x: 60, y: 220 });
  // Pan vertical do background durante a queda: 0% = topo do ceu.png (céu
  // aberto), 100% = base (cidade no horizonte + oceano). Animado conforme
  // o tempo passa para reforçar que estão caindo de muito alto.
  const bgPosY = useRef(0);

  // Velocidade base (px/tick a 50ms). Usada em ambos os eixos:
  //  - falling: nuvens sobem (y -= speed) — efeito de queda dos personagens
  //  - flying/failed: nuvens passam horizontal (x -= speed) — viagem
  // Valores diferentes por nuvem dão parallax (mais próxima = mais rápida).
  // Velocidades dobradas a pedido (eram 0.93/0.5/0.625/0.383).
  // Y de todas mantido dentro de [60, 320] — bem acima do quarto inferior
  // (mar/cidade do ceu.png), considerando que cada nuvem renderizada
  // ocupa ~30–80px de altura abaixo do `top`.
  const cloudPositions = useRef([
    { x: 20, y: 60, speed: 1.86 },    // nuvem1 — 180w, frente do sol
    { x: 220, y: 140, speed: 1.0 },   // nuvem2 — 120w, atrás do sol
    { x: -40, y: 230, speed: 1.25 },  // nuvem3 — 120w, frente do sol
    { x: 280, y: 310, speed: 0.766 }, // nuvem4 —  80w, atrás do sol
  ]);
  // Posições iniciais salvas para o reset().
  const cloudInitial = useRef([
    { x: 20, y: 60 },
    { x: 220, y: 140 },
    { x: -40, y: 230 },
    { x: 280, y: 310 },
  ]);

  const cancelledRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ========== SPAWN PARTICLES ==========
  const spawnParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const distance = 60 + Math.random() * 100;
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

  // ========== UNITE (transição pra voo — pixel art) ==========
  // Sequência:
  //   1. Bonecos se aproximam no centro (800ms).
  //   2. BIRTH: coração pixel aparece em 3 steps discretos.
  //   3. BEAT: 3 batidas.
  //   4. POWER_UP: cresce em 6 steps com paletas ciclando.
  //   5. SNAP: troca instantânea — coração some, casal voando aparece.
  const unite = useCallback(() => {
    if (stateRef.current !== 'falling') return;
    setState('flying');
    stateRef.current = 'flying';

    // centerY=178 coloca o wrapper (altura 225) com centro em y=290.5,
    // ou seja, no meio vertical do canvas 580. Antes era 280, o que
    // empurrava os bonecos pra metade inferior da tela no abraço.
    const centerY = 178;
    // Abraçados: cada boneco se aproxima 25px do centro a partir do lado-a-lado,
    // criando sobreposição visual de ~50px (40% da largura). Combinação ainda
    // centrada no canvas 380 (centro em 190).
    bridePos.current = { x: 165, y: centerY };
    groomPos.current = { x: 90, y: centerY };

    if (brideRef.current) {
      brideRef.current.style.transition = 'all 0.2s ease-out';
      brideRef.current.style.left = '165px';
      brideRef.current.style.right = 'auto';
      brideRef.current.style.top = centerY + 'px';
    }
    if (groomRef.current) {
      groomRef.current.style.transition = 'all 0.2s ease-out';
      groomRef.current.style.left = '90px';
      groomRef.current.style.right = 'auto';
      groomRef.current.style.top = centerY + 'px';
    }

    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    cancelledRef.current = false;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    const run = async () => {
      // Aguarda bonecos chegarem ao centro (sincronizado com a transition CSS)
      await wait(200);
      if (cancelledRef.current) return;

      // BIRTH — 3 steps discretos
      setHeartPhase('BIRTH');
      setHeartOpacity(1);
      setPaletteIdx(0);
      for (const s of [1, 1.5, 1]) {
        setHeartScale(s);
        await wait(TIMING.popStep);
        if (cancelledRef.current) return;
      }

      // BEAT — 3 batidas
      setHeartPhase('BEAT');
      for (let i = 0; i < TIMING.beatCount; i++) {
        setHeartScale(1.3);
        await wait(TIMING.beatExpand);
        if (cancelledRef.current) return;
        setHeartScale(1);
        await wait(TIMING.beatContract);
        if (cancelledRef.current) return;
      }

      // POWER_UP — 6 steps com cores ciclando
      setHeartPhase('POWER_UP');
      for (const step of GROW_STEPS_PROTO) {
        setHeartScale(step.scale);
        setPaletteIdx(step.paletteIdx);
        await wait(TIMING.growStep);
        if (cancelledRef.current) return;
      }

      // SNAP — troca instantânea: coração some, casal voando aparece
      setHeartPhase('SNAP');
      setHeartOpacity(0);
      spawnParticles();
      setTimeout(() => setShowButton(true), 600);
    };

    void run();
  }, [spawnParticles]);

  // ========== FAIL ==========
  // useCallback com [] — todas as deps são refs ou setters estáveis do React
  const fail = useCallback(() => {
    setState('failed');
    stateRef.current = 'failed';

    if (brideRef.current) {
      brideRef.current.style.transition = 'all 1s ease-in';
      brideRef.current.style.top = '470px';
    }
    if (groomRef.current) {
      groomRef.current.style.transition = 'all 1s ease-in';
      groomRef.current.style.top = '470px';
    }

    // Após 1s os bonecos chegam à parte inferior (mar). Dispara splash
    // no ponto de impacto e fade-out via opacity (controlada no JSX).
    // Splash X = centro do boneco (x + 62, metade da largura 125).
    // Splash Y ≈ 540 (linha da água perto da base do container 580).
    setTimeout(() => {
      setBrideFell({ x: bridePos.current.x + 62, y: 540 });
      setGroomFell({ x: groomPos.current.x + 62, y: 540 });
    }, 1000);

    setTimeout(() => setShowFailText(true), 1800);
  }, []);

  // ========== UNION CHECK ==========
  // useCallback necessário: capturado pelo drag useEffect (deps array)
  const checkUnion = useCallback(() => {
    const dx = Math.abs(bridePos.current.x - groomPos.current.x);
    const dy = Math.abs(bridePos.current.y - groomPos.current.y);
    // Threshold ajustado pros bonecos 125w. Posições iniciais (José x=60,
    // Letícia x=195) têm dx=135, então o threshold tem que ficar BEM abaixo
    // disso ou o unite() dispara no primeiro pixel de drag e os bonecos
    // "fogem" antes do usuário arrastar. 100 = exige ~35px de aproximação,
    // sobreposição visual de ~25px (eles se "abraçam" antes do voo).
    if (dx < 100 && dy < 50) {
      unite();
    }
  }, [unite]);

  // ========== DRAG ==========
  useEffect(() => {
    function setupDrag(
      el: HTMLDivElement | null,
      posObj: { current: { x: number; y: number } }
    ) {
      if (!el) return () => {};
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let startPosX = 0;
      let startPosY = 0;

      function onStart(e: MouseEvent | TouchEvent) {
        if (stateRef.current !== 'falling') return;
        dragging = true;
        const point = 'touches' in e ? e.touches[0] : e;
        startX = point.clientX;
        startY = point.clientY;
        startPosX = posObj.current.x;
        startPosY = posObj.current.y;
        if (el) el.style.cursor = 'grabbing';
        e.preventDefault();
      }

      function onMove(e: MouseEvent | TouchEvent) {
        if (!dragging || stateRef.current !== 'falling') return;
        const point = 'touches' in e ? e.touches[0] : e;
        const dx = point.clientX - startX;
        const dy = point.clientY - startY;
        // Limites dinâmicos: container 380x580, descontando tamanho do boneco
        // para a Letícia (125x225) e o José (50x90) terem clamps corretos.
        const maxX = 380 - (el?.offsetWidth || 50);
        const maxY = 580 - (el?.offsetHeight || 90);
        posObj.current.x = Math.max(0, Math.min(maxX, startPosX + dx));
        posObj.current.y = Math.max(80, Math.min(maxY, startPosY + dy));
        if (el) {
          el.style.left = posObj.current.x + 'px';
          el.style.top = posObj.current.y + 'px';
          el.style.right = 'auto';
        }
        checkUnion();
        e.preventDefault();
      }

      function onEnd() {
        dragging = false;
        if (el) el.style.cursor = 'grab';
      }

      el.addEventListener('mousedown', onStart);
      el.addEventListener('touchstart', onStart, { passive: false });
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchend', onEnd);

      return () => {
        el.removeEventListener('mousedown', onStart);
        el.removeEventListener('touchstart', onStart);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchend', onEnd);
      };
    }

    const cleanup1 = setupDrag(brideRef.current, bridePos);
    const cleanup2 = setupDrag(groomRef.current, groomPos);
    return () => {
      cleanup1();
      cleanup2();
    };
  }, [checkUnion]);

  // ========== FALLING ==========
  // Enquanto cai: bonecos descem (clamp em 450) e o background do céu
  // panneia verticalmente revelando a cidade (~14s do topo até a base).
  useEffect(() => {
    if (state !== 'falling') return;
    const interval = setInterval(() => {
      // unite() seta stateRef.current = 'flying' sincronicamente. Esse guard
      // dentro do callback para a queda imediatamente, sem esperar o cleanup
      // do effect (que só roda após o React rerender, ~50-100ms de delay).
      // Sem isso, 1-2 ticks de y += 0.6 sobrescreviam o style.top que o unite()
      // acabou de animar, empurrando os bonecos pra baixo do centro.
      if (stateRef.current !== 'falling') return;
      bridePos.current.y += 0.6;
      groomPos.current.y += 0.6;
      if (bridePos.current.y > 450) bridePos.current.y = 450;
      if (groomPos.current.y > 450) groomPos.current.y = 450;
      if (brideRef.current)
        brideRef.current.style.top = bridePos.current.y + 'px';
      if (groomRef.current)
        groomRef.current.style.top = groomPos.current.y + 'px';

      if (bgPosY.current < 100) {
        bgPosY.current = Math.min(100, bgPosY.current + 0.35);
        if (containerRef.current) {
          containerRef.current.style.backgroundPosition = `center ${bgPosY.current}%`;
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, [state]);

  // ========== COUNTDOWN ==========
  useEffect(() => {
    if (state !== 'falling') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fail();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state, fail]);

  // ========== CLOUDS ==========
  // Direção depende do state:
  //  - falling: nuvens sobem (mundo subindo enquanto bonecos caem). Quando
  //    saem por cima, reentram por baixo em x aleatório para variar a cena.
  //  - flying/failed: nuvens passam horizontalmente da direita pra esquerda,
  //    reforçando a viagem após o casal se unir.
  useEffect(() => {
    const cloudElRefs = [cloud0Ref, cloud1Ref, cloud2Ref, cloud3Ref];
    const interval = setInterval(() => {
      cloudPositions.current.forEach((c, i) => {
        const el = cloudElRefs[i].current;
        if (stateRef.current === 'falling') {
          c.y -= c.speed;
          const h = el?.offsetHeight ?? 100;
          if (c.y < -h) {
            // Reentra na zona segura de céu (180–330), bem acima do
            // mar/cidade (que começa em y ≈ 435).
            c.y = 180 + Math.random() * 150;
            c.x = Math.random() * 320 - 40;
          }
        } else {
          c.x -= c.speed;
          const w = el?.offsetWidth ?? 100;
          if (c.x < -w) c.x = 380;
        }
        if (el) {
          el.style.left = c.x + 'px';
          el.style.top = c.y + 'px';
        }
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // ========== SUN BREATHE ==========
  // Oscilação leve de escala (1.0 → 1.05 → 1.0) em loop de 4s ease-in-out.
  // Web Animations API evita injetar @keyframes no CSS global.
  useEffect(() => {
    const el = sunRef.current;
    if (!el) return;
    const anim = el.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.05)' },
        { transform: 'scale(1)' },
      ],
      { duration: 4000, iterations: Infinity, easing: 'ease-in-out' }
    );
    return () => anim.cancel();
  }, []);

  // Cancela animação em-flight do coração se o componente desmontar.
  useEffect(() => {
    return () => { cancelledRef.current = true; };
  }, []);

  // ========== PRESS START BLINK ==========
  // Blink clássico arcade no "PRESS START" — step-end (sem fade) pra dar
  // a sensação de pisca duro de cartucho NES. Só roda quando o botão
  // já está visível (showButton=true).
  useEffect(() => {
    if (!showButton) return;
    const el = pressStartRef.current;
    if (!el) return;
    const anim = el.animate(
      [{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0, offset: 0.5 }, { opacity: 0 }],
      { duration: 1000, iterations: Infinity, easing: 'steps(1, end)' }
    );
    return () => anim.cancel();
  }, [showButton]);

  // ========== RESET ==========
  function reset() {
    setState('falling');
    stateRef.current = 'falling';
    setTimeLeft(15);
    setShowButton(false);
    setShowFailText(false);
    setBrideFell(null);
    setGroomFell(null);
    setHeartPhase('IDLE');
    setHeartScale(0);
    setHeartOpacity(0);
    setPaletteIdx(0);
    setParticles([]);
    cancelledRef.current = true;

    bridePos.current = { x: 195, y: 220 };
    groomPos.current = { x: 60, y: 220 };

    if (brideRef.current) {
      brideRef.current.style.transition = 'none';
      brideRef.current.style.left = 'auto';
      brideRef.current.style.right = '60px';
      brideRef.current.style.top = '220px';
    }
    if (groomRef.current) {
      groomRef.current.style.transition = 'none';
      groomRef.current.style.left = '60px';
      groomRef.current.style.right = 'auto';
      groomRef.current.style.top = '220px';
    }

    // Volta o pan do céu pro topo (céu aberto, sem cidade ainda).
    bgPosY.current = 0;
    if (containerRef.current) {
      containerRef.current.style.backgroundPosition = 'center 0%';
    }

    // Restaura nuvens nas posições iniciais e nos elementos DOM.
    const cloudElRefs = [cloud0Ref, cloud1Ref, cloud2Ref, cloud3Ref];
    cloudInitial.current.forEach((init, i) => {
      cloudPositions.current[i].x = init.x;
      cloudPositions.current[i].y = init.y;
      const el = cloudElRefs[i].current;
      if (el) {
        el.style.left = init.x + 'px';
        el.style.top = init.y + 'px';
      }
    });
  }

  const router = useRouter();

  // ========== HANDLER DO BOTÃO PRINCIPAL ==========
  function handleEnterClick() {
    router.push('/admin');
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '380px',
        height: '580px',
        margin: '0 auto',
        overflow: 'hidden',
        borderRadius: '16px',
        // ceu.png já traz céu pôr do sol + cidade no horizonte + oceano com
        // ondas cartoon. Substitui o gradiente CSS e o SVG de mar/horizonte.
        // backgroundPosition é alterado em runtime pelo useEffect FALLING
        // (pan vertical 0% → 100% revelando a cidade conforme caem).
        backgroundImage: 'url(/landing/ceu.png)',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center 0%',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* Sol cartoon — z-index 1, atrás de todas as nuvens (z=3).
          top negativo faz parte do sol sair pelo topo (efeito de sol gigante
          baixando do céu); o overflow:hidden do container corta. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={sunRef}
        src="/landing/sol.png"
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          top: '-150px',
          right: '0px',
          width: '340px',
          height: 'auto',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 1,
          transformOrigin: 'center',
        }}
      />

      {/* Nuvens — todas em zIndex 3, à frente do sol (z=1). O `top` é
          definido pelo JSX inicialmente e atualizado em runtime pelo
          useEffect CLOUDS (sobem no falling, ficam fixas no flying). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={cloud0Ref}
        src="/landing/nuvem1.png"
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          top: '60px',
          left: '20px',
          width: '180px',
          height: 'auto',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 3,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={cloud1Ref}
        src="/landing/nuvem2.png"
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          top: '140px',
          left: '220px',
          width: '120px',
          height: 'auto',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 3,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={cloud2Ref}
        src="/landing/nuvem3.png"
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          top: '230px',
          left: '-40px',
          width: '120px',
          height: 'auto',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 3,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={cloud3Ref}
        src="/landing/nuvem4.png"
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          top: '310px',
          left: '280px',
          width: '80px',
          height: 'auto',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 3,
        }}
      />

      {/* Contagem regressiva */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff8dc',
          fontSize: '32px',
          fontWeight: 500,
          fontFamily: 'monospace',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 10,
          opacity: state === 'falling' ? 1 : 0,
          transition: 'opacity 0.5s',
        }}
      >
        {timeLeft}
      </div>

      {/* Instrução */}
      <div
        style={{
          position: 'absolute',
          top: '64px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff8dc',
          fontSize: '14px',
          letterSpacing: '2px',
          textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          zIndex: 10,
          whiteSpace: 'nowrap',
          opacity: state === 'falling' ? 1 : 0,
          transition: 'opacity 0.5s',
        }}
      >
        UNA O CASAL
      </div>

      {/* Casal voando — canvas com ping-pong real via gifuct-js. O componente
          sempre renderiza no DOM (fetch + decode disparam no mount = warm-up),
          mas o wrapper fica em opacity 0 até o SNAP, garantindo zero delay
          no momento da transição. Cenário (céu/sol/nuvens) permanece intacto. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '204px',
          pointerEvents: 'none',
          zIndex: 5,
          opacity: heartPhase === 'SNAP' ? 1 : 0,
        }}
      >
        <FlyingScene src="/landing/casalvoando.gif" pingPong />
      </div>

      {/* Noiva — GIF animado da Letícia. Fica à DIREITA da cena, espelhada
          horizontalmente para encarar o José que vem da esquerda. */}
      <div
        ref={brideRef}
        style={{
          position: 'absolute',
          top: '220px',
          right: '60px',
          width: '125px',
          height: '225px',
          cursor: 'grab',
          touchAction: 'none',
          zIndex: 5,
          opacity:
            brideFell || heartPhase === 'SNAP' ? 0 : 1,
          transition:
            heartPhase === 'IDLE' ? 'opacity 0.5s ease-out' : 'opacity 0s',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/pingpong.gif"
          alt="Letícia"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            mixBlendMode: 'multiply',
            userSelect: 'none',
            transform: 'scale(0.8) scaleX(-1)',
          }}
        />
      </div>

      {/* Noivo — GIF animado do José. Fica à ESQUERDA da cena (mesmo tamanho
          da Letícia para coerência visual). */}
      <div
        ref={groomRef}
        style={{
          position: 'absolute',
          top: '220px',
          left: '60px',
          width: '125px',
          height: '225px',
          cursor: 'grab',
          touchAction: 'none',
          zIndex: 5,
          opacity:
            groomFell || heartPhase === 'SNAP' ? 0 : 1,
          transition:
            heartPhase === 'IDLE' ? 'opacity 0.5s ease-out' : 'opacity 0s',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/josepingpong.gif"
          alt="José"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            mixBlendMode: 'multiply',
            userSelect: 'none',
            transform: 'scale(0.8)',
          }}
        />
      </div>

      {/* Coração pixel da transição (over os personagens) */}
      <PixelHeart
        scale={heartScale}
        opacity={heartOpacity}
        palette={POWER_UP_PALETTES[paletteIdx]}
      />

      {/* Partículas pixel explodem no SNAP */}
      {particles.map((p) => (
        <PixelParticle key={p.id} particle={p} />
      ))}

      {/* Splash de água quando os bonecos batem na superfície (após fail) */}
      {brideFell && <Splash x={brideFell.x} y={brideFell.y} />}
      {groomFell && <Splash x={groomFell.x} y={groomFell.y} />}

      {/* Botão "VOCÊ É DIGNO / PRESS START" — estética arcade Nintendo.
          Press_Start_2P (next/font/google) na linha de baixo + blink
          via Web Animations API (steps(1,end) = pisca duro, sem fade). */}
      <button
        onClick={handleEnterClick}
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '14px 24px',
          background: 'transparent',
          color: '#fff8dc',
          border: 'none',
          fontFamily: 'var(--font-press-start), monospace',
          cursor: 'pointer',
          opacity: showButton ? 1 : 0,
          transition: 'opacity 1s ease-in',
          zIndex: 10,
          textShadow: '2px 2px 0 #000, 0 0 12px rgba(0,0,0,0.6)',
          pointerEvents: showButton ? 'auto' : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          imageRendering: 'pixelated',
        }}
      >
        <span style={{ fontSize: '14px', letterSpacing: '1px' }}>
          VOCÊ É DIGNO
        </span>
        <span
          ref={pressStartRef}
          style={{ fontSize: '10px', letterSpacing: '2px', color: '#ffd700' }}
        >
          PRESS START
        </span>
      </button>

      {/* Overlay de fail */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            state === 'failed' ? 'rgba(20,15,40,0.92)' : 'rgba(20,15,40,0)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          pointerEvents: state === 'failed' ? 'auto' : 'none',
          transition: 'background 1s ease',
          zIndex: 20,
        }}
      >
        <div
          style={{
            color: '#ffd896',
            fontFamily: 'serif',
            fontSize: '18px',
            textAlign: 'center',
            lineHeight: 1.5,
            maxWidth: '280px',
            opacity: showFailText ? 1 : 0,
            transition: 'opacity 1s ease',
          }}
        >
          Eles só serão felizes juntos. Faça-os darem as mãos, poxa!
        </div>
        <button
          onClick={reset}
          style={{
            marginTop: '24px',
            padding: '10px 24px',
            background: 'transparent',
            color: '#ffd896',
            border: '1.5px solid #ffd896',
            borderRadius: '999px',
            fontFamily: 'serif',
            fontSize: '13px',
            cursor: 'pointer',
            opacity: showFailText ? 1 : 0,
            transition: 'opacity 1s ease',
          }}
        >
          Tentar de novo
        </button>
      </div>

    </div>
  );
}
