'use client';

/**
 * FallingScene
 * ------------
 * Cena de queda livre: Letícia e José em lados opostos, ambos arrastáveis
 * via framer-motion. Quando a distância euclidiana entre os centros for
 * menor que PROXIMITY_THRESHOLD, dispara `onHandsUnited` (apenas uma vez).
 *
 * Briefing — tarefa 1:
 *  - Renderiza Letícia e José em posições draggáveis
 *  - Detecta proximidade (distância < 80px)
 *  - Pose inicial em lados opostos, altura aleatória (queda livre suave)
 *
 * Uso:
 *   <FallingScene onHandsUnited={() => setHandsUnited(true)} />
 */

import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

const PROXIMITY_THRESHOLD = 80; // px — pedido explícito do briefing

type Props = {
  onHandsUnited: () => void;
  brideSrc?: string;
  groomSrc?: string;
  /** Para casar com o "halo" do GIF não-transparente até a versão final.
   *  Quando a Letícia tiver o GIF transparente, passar 'normal'. */
  brideBlendMode?: 'normal' | 'multiply';
  groomBlendMode?: 'normal' | 'multiply';
};

function randomYPercent(): number {
  // Faixa 25–45% pra simular "queda" em alturas diferentes
  return 25 + Math.random() * 20;
}

export function FallingScene({
  onHandsUnited,
  brideSrc = '/landing/pingpong.gif',
  groomSrc = '/landing/josepingpong.gif',
  brideBlendMode = 'multiply',
  groomBlendMode = 'multiply',
}: Props) {
  const brideRef = useRef<HTMLDivElement>(null);
  const groomRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);
  // Altura inicial aleatória — gerada apenas uma vez no mount
  const [brideTop] = useState<number>(() => randomYPercent());
  const [groomTop] = useState<number>(() => randomYPercent());

  const checkProximity = useCallback(() => {
    if (firedRef.current) return;
    const b = brideRef.current?.getBoundingClientRect();
    const g = groomRef.current?.getBoundingClientRect();
    if (!b || !g) return;
    const bx = b.left + b.width / 2;
    const by = b.top + b.height / 2;
    const gx = g.left + g.width / 2;
    const gy = g.top + g.height / 2;
    const dist = Math.hypot(bx - gx, by - gy);
    if (dist < PROXIMITY_THRESHOLD) {
      firedRef.current = true;
      onHandsUnited();
    }
  }, [onHandsUnited]);

  // Loop leve de checagem enquanto a cena está visível. requestAnimationFrame
  // é suficientemente barato e não conflita com o drag do framer-motion.
  useEffect(() => {
    let raf = 0;
    function tick() {
      checkProximity();
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [checkProximity]);

  const wrapperBase = {
    position: 'absolute' as const,
    width: '125px',
    height: '225px',
    cursor: 'grab' as const,
    touchAction: 'none' as const,
    zIndex: 5,
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* José — esquerda */}
      <motion.div
        ref={groomRef}
        drag
        dragMomentum={false}
        whileDrag={{ cursor: 'grabbing' }}
        style={{
          ...wrapperBase,
          left: '12%',
          top: `${groomTop}%`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={groomSrc}
          alt="José"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
            mixBlendMode: groomBlendMode,
          }}
        />
      </motion.div>

      {/* Letícia — direita, espelhada pra encarar o José */}
      <motion.div
        ref={brideRef}
        drag
        dragMomentum={false}
        whileDrag={{ cursor: 'grabbing' }}
        style={{
          ...wrapperBase,
          right: '12%',
          top: `${brideTop}%`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brideSrc}
          alt="Letícia"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
            mixBlendMode: brideBlendMode,
            transform: 'scaleX(-1)',
          }}
        />
      </motion.div>
    </div>
  );
}
