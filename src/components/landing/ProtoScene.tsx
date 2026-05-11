'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type SceneState = 'falling' | 'flying' | 'failed';

export function ProtoScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const brideRef = useRef<HTMLDivElement>(null);
  const groomRef = useRef<HTMLDivElement>(null);
  const cloud0Ref = useRef<HTMLDivElement>(null);
  const cloud1Ref = useRef<HTMLDivElement>(null);
  const cloud2Ref = useRef<HTMLDivElement>(null);
  const cloud3Ref = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<SceneState>('falling');
  const [timeLeft, setTimeLeft] = useState(15);
  const [showButton, setShowButton] = useState(false);
  const [showFailText, setShowFailText] = useState(false);

  const stateRef = useRef<SceneState>('falling');
  // José (groom) começa à esquerda em left=60. Letícia (bride) começa à direita
  // em right=60 — com largura 125 e container 380, left-effective = 380-125-60 = 195.
  const bridePos = useRef({ x: 195, y: 220 });
  const groomPos = useRef({ x: 60, y: 220 });

  const cloudPositions = useRef([
    { x: -60, y: 80, vx: 0.8, vy: 1.2 },
    { x: 290, y: 200, vx: -0.6, vy: 1.5 },
    { x: 20, y: 340, vx: 0.5, vy: 1.0 },
    { x: 250, y: 420, vx: -0.7, vy: 1.3 },
  ]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ========== UNITE (transição pra voo) ==========
  // useCallback com [] — todas as deps são refs ou setters estáveis do React
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

    // Após transição, inicia loop de voo
    setTimeout(() => {
      if (brideRef.current) brideRef.current.style.transition = 'none';
      if (groomRef.current) groomRef.current.style.transition = 'none';

      let t = 0;
      function flyLoop() {
        if (stateRef.current !== 'flying') return;
        t += 0.04;
        const offsetY = Math.sin(t) * 8;
        if (brideRef.current)
          brideRef.current.style.top = centerY + offsetY + 'px';
        if (groomRef.current)
          groomRef.current.style.top = centerY + offsetY + 'px';
        requestAnimationFrame(flyLoop);
      }
      flyLoop();

      // Botão aparece 1.5s depois
      setTimeout(() => setShowButton(true), 1500);
    }, 800);
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
  useEffect(() => {
    // Array local dentro do effect — acesso a .current aqui é seguro (fora do render)
    const cloudElRefs = [cloud0Ref, cloud1Ref, cloud2Ref, cloud3Ref];
    const interval = setInterval(() => {
      cloudPositions.current.forEach((c, i) => {
        if (stateRef.current === 'flying') {
          c.x -= 1.5;
          if (c.x < -150) c.x = 380;
        } else {
          c.y -= c.vy;
          if (c.y < -50) {
            c.y = 600;
            c.x = Math.random() * 320 - 40;
          }
        }
        const el = cloudElRefs[i].current;
        if (el) {
          el.style.left = c.x + 'px';
          el.style.top = c.y + 'px';
        }
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // ========== RESET ==========
  function reset() {
    setState('falling');
    stateRef.current = 'falling';
    setTimeLeft(15);
    setShowButton(false);
    setShowFailText(false);

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
        background:
          'linear-gradient(180deg, #f5b893 0%, #f7a07c 30%, #e8849a 60%, #b67ea8 90%, #5d5680 100%)',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* Mar e horizonte */}
      <svg
        viewBox="0 0 380 580"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        preserveAspectRatio="none"
      >
        <ellipse cx="190" cy="540" rx="280" ry="60" fill="#d68a6a" opacity="0.6" />
        <ellipse cx="190" cy="555" rx="320" ry="50" fill="#a85f6e" opacity="0.5" />
        <line
          x1="0"
          y1="510"
          x2="380"
          y2="510"
          stroke="#f9d896"
          strokeWidth="2"
          opacity="0.7"
        />
        {/* Sol */}
        <circle cx="280" cy="120" r="40" fill="#fde0a8" opacity="0.5" />
        <circle cx="280" cy="120" r="28" fill="#fbc678" opacity="0.7" />
      </svg>

      {/* Nuvens */}
      <div
        ref={cloud0Ref}
        style={{
          position: 'absolute',
          top: '80px',
          left: '-60px',
          width: '120px',
          height: '35px',
          background: 'rgba(255,240,230,0.7)',
          borderRadius: '50px',
          pointerEvents: 'none',
        }}
      />
      <div
        ref={cloud1Ref}
        style={{
          position: 'absolute',
          top: '200px',
          right: '-40px',
          width: '90px',
          height: '28px',
          background: 'rgba(255,220,210,0.6)',
          borderRadius: '50px',
          pointerEvents: 'none',
        }}
      />
      <div
        ref={cloud2Ref}
        style={{
          position: 'absolute',
          top: '340px',
          left: '20px',
          width: '140px',
          height: '38px',
          background: 'rgba(255,200,200,0.5)',
          borderRadius: '50px',
          pointerEvents: 'none',
        }}
      />
      <div
        ref={cloud3Ref}
        style={{
          position: 'absolute',
          top: '420px',
          right: '10px',
          width: '100px',
          height: '30px',
          background: 'rgba(255,180,190,0.6)',
          borderRadius: '50px',
          pointerEvents: 'none',
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

      {/* Banner de protótipo */}
      <div
        data-testid="prototype-banner"
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,248,220,0.5)',
          fontSize: '10px',
          fontFamily: 'monospace',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        🚧 Protótipo · arte final em produção
      </div>
    </div>
  );
}
