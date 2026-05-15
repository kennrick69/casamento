'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type SceneState = 'falling' | 'flying' | 'failed';

// Fases internas da transição do coração + troca dos personagens pelo GIF
// do casal voando. Cenário (céu/sol/nuvens) permanece intacto o tempo todo.
type HeartPhase = 'IDLE' | 'BIRTH' | 'GROWTH' | 'MERGE' | 'CROSSFADE' | 'DONE';

const HEART_TIMING = {
  birth: 400,
  growth: 500,
  merge: 300,
  crossfade: 400,
} as const;

const HEART_COLORS = {
  start: '#FF6B9D',
  mid: '#FFB088',
  end: '#FFD4B8',
} as const;

function getHeartState(phase: HeartPhase) {
  switch (phase) {
    case 'IDLE':
      return {
        scale: 0,
        opacity: 0,
        fill: HEART_COLORS.start,
        easing: 'ease',
        duration: 0,
      };
    case 'BIRTH':
      return {
        scale: 1.5,
        opacity: 1,
        fill: HEART_COLORS.start,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        duration: HEART_TIMING.birth,
      };
    case 'GROWTH':
      return {
        scale: 4,
        opacity: 1,
        fill: HEART_COLORS.mid,
        easing: 'ease-in',
        duration: HEART_TIMING.growth,
      };
    case 'MERGE':
      return {
        scale: 2.5,
        opacity: 1,
        fill: HEART_COLORS.end,
        easing: 'ease-out',
        duration: HEART_TIMING.merge,
      };
    case 'CROSSFADE':
      return {
        scale: 2.5,
        opacity: 0,
        fill: HEART_COLORS.end,
        easing: 'ease',
        duration: HEART_TIMING.crossfade,
      };
    case 'DONE':
      return {
        scale: 0,
        opacity: 0,
        fill: HEART_COLORS.end,
        easing: 'ease',
        duration: 0,
      };
  }
}

function Heart({ phase }: { phase: HeartPhase }) {
  const s = getHeartState(phase);
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        top: '280px',
        width: 80,
        height: 80,
        pointerEvents: 'none',
        transform: `translate(-50%, -50%) scale(${s.scale})`,
        opacity: s.opacity,
        transition: `transform ${s.duration}ms ${s.easing}, opacity ${s.duration}ms ease`,
        willChange: 'transform, opacity',
        zIndex: 7,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <path
          d="M50 88 C20 65, 10 40, 25 25 C35 15, 45 20, 50 32 C55 20, 65 15, 75 25 C90 40, 80 65, 50 88 Z"
          fill={s.fill}
          style={{ transition: `fill ${s.duration}ms ease-in` }}
        />
      </svg>
    </div>
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

  const [state, setState] = useState<SceneState>('falling');
  const [timeLeft, setTimeLeft] = useState(15);
  const [showButton, setShowButton] = useState(false);
  const [showFailText, setShowFailText] = useState(false);
  // Transição do coração após união. Letícia/José fazem fade-out e o
  // casalvoando.gif aparece no centro. Cenário não é tocado.
  const [heartPhase, setHeartPhase] = useState<HeartPhase>('IDLE');
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

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ========== UNITE (transição pra voo) ==========
  // Sequência:
  //   1. Bonecos se aproximam no centro (800ms).
  //   2. Coração nasce/cresce/funde (BIRTH→GROWTH→MERGE→CROSSFADE).
  //   3. Durante o CROSSFADE, os 2 GIFs somem e o casalvoando.gif aparece.
  //   4. Botão "você é digno" aparece 600ms depois.
  const unite = useCallback(() => {
    if (stateRef.current !== 'falling') return;
    setState('flying');
    stateRef.current = 'flying';

    const centerY = 280;
    // Abraçados: cada boneco se aproxima 25px do centro a partir do lado-a-lado,
    // criando sobreposição visual de ~50px (40% da largura). Combinação ainda
    // centrada no canvas 380 (centro em 190).
    bridePos.current = { x: 165, y: centerY };
    groomPos.current = { x: 90, y: centerY };

    if (brideRef.current) {
      brideRef.current.style.transition = 'all 0.8s ease-out';
      brideRef.current.style.left = '165px';
      brideRef.current.style.right = 'auto';
      brideRef.current.style.top = centerY + 'px';
    }
    if (groomRef.current) {
      groomRef.current.style.transition = 'all 0.8s ease-out';
      groomRef.current.style.left = '90px';
      groomRef.current.style.right = 'auto';
      groomRef.current.style.top = centerY + 'px';
    }

    // Vibração leve no celular ao unir (haptic API)
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // Sequência: aproximação termina em 800ms → começa o coração
    const t0 = 800;
    const tBirth = t0 + HEART_TIMING.birth;
    const tGrowth = tBirth + HEART_TIMING.growth;
    const tMerge = tGrowth + HEART_TIMING.merge;
    const tCrossfade = tMerge + HEART_TIMING.crossfade;

    setTimeout(() => setHeartPhase('BIRTH'), t0);
    setTimeout(() => setHeartPhase('GROWTH'), tBirth);
    setTimeout(() => setHeartPhase('MERGE'), tGrowth);
    setTimeout(() => setHeartPhase('CROSSFADE'), tMerge);
    setTimeout(() => setHeartPhase('DONE'), tCrossfade);
    setTimeout(() => setShowButton(true), tCrossfade + 600);
  }, []);

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

      {/* Casal voando — substitui os 2 GIFs após a transição do coração.
          Fica oculto até o CROSSFADE; fade-in junto com o sumiço dos
          bonecos. Cenário (céu/sol/nuvens) permanece intacto. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/landing/casalvoando.gif"
        alt="Casal voando"
        draggable={false}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '300px',
          height: 'auto',
          objectFit: 'contain',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 5,
          opacity:
            heartPhase === 'CROSSFADE' || heartPhase === 'DONE' ? 1 : 0,
          transition: 'opacity 400ms ease',
        }}
      />

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
            brideFell ||
            heartPhase === 'CROSSFADE' ||
            heartPhase === 'DONE'
              ? 0
              : 1,
          transition: 'opacity 0.5s ease-out',
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
            transform: 'scaleX(-1)',
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
            groomFell ||
            heartPhase === 'CROSSFADE' ||
            heartPhase === 'DONE'
              ? 0
              : 1,
          transition: 'opacity 0.5s ease-out',
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
          }}
        />
      </div>

      {/* Coração da transição (over os personagens) */}
      <Heart phase={heartPhase} />

      {/* Splash de água quando os bonecos batem na superfície (após fail) */}
      {brideFell && <Splash x={brideFell.x} y={brideFell.y} />}
      {groomFell && <Splash x={groomFell.x} y={groomFell.y} />}

      {/* Botão "Você é digno" */}
      <button
        onClick={handleEnterClick}
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '14px 28px',
          background: 'rgba(255,248,220,0.95)',
          color: '#5d3a1a',
          border: '2px solid #f9d896',
          borderRadius: '999px',
          fontFamily: 'serif',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          opacity: showButton ? 1 : 0,
          transition: 'opacity 1s ease-in',
          zIndex: 10,
          boxShadow: '0 0 20px rgba(255,220,150,0.6)',
          pointerEvents: showButton ? 'auto' : 'none',
        }}
      >
        Você é digno deste convite ✨
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
