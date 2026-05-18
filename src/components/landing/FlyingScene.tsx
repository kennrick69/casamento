'use client';

/**
 * FlyingScene — canvas-based GIF player com ping-pong real.
 *
 * GIF nativo do navegador só faz loop forward. Pra ter ping-pong de verdade
 * (forward → reverse → forward), o componente decodifica o GIF em frames
 * via `gifuct-js`, pré-compõe cada frame respeitando disposalType (0/1/2/3)
 * e roda em requestAnimationFrame respeitando os delays originais.
 *
 * Warm-up: o useEffect dispara fetch + decode no mount, mesmo que o
 * componente esteja com opacity 0 no pai. Quando o pai revela o canvas
 * (SNAP no ProtoScene), os frames já estão pré-renderizados.
 *
 * Anti-halo:
 *  - clearRect antes de cada drawImage no tick (pixels do frame anterior
 *    em áreas transparentes do novo frame não acumulam)
 *  - Threshold de alpha no pre-compose (alpha binário, sem semi-transp)
 *  - Canvas em pixels físicos (DPR-aware) com scaling via drawImage interno
 *    (browser usa pre-multiplied alpha → sem halo de CSS scaling)
 *
 * Uso:
 *   <FlyingScene src="/landing/casalvoando.gif" pingPong />
 */

import { useEffect, useRef } from 'react';
import { parseGIF, decompressFrames } from 'gifuct-js';

type Props = {
  src: string;
  pingPong?: boolean;
};

export function FlyingScene({ src, pingPong = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    let rafId = 0;

    (async () => {
      const buffer = await fetch(src).then((r) => r.arrayBuffer());
      if (cancelled) return;

      const gif = parseGIF(buffer);
      const decoded = decompressFrames(gif, true);
      if (cancelled || decoded.length === 0) return;

      const w = gif.lsd.width;
      const h = gif.lsd.height;

      // Pré-composição: para cada frame do GIF, aplicar disposal do anterior
      // + desenhar patch atual num buffer full-size, e snapshotar o resultado.
      // Disposal types:
      //   0/1 = leave (default)
      //   2   = restore to background (clear area do frame anterior)
      //   3   = restore previous (restaurar canvas pro estado pré-frame anterior)
      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = w;
      fullCanvas.height = h;
      const fullCtx = fullCanvas.getContext('2d');
      if (!fullCtx) return;

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      const composed: HTMLCanvasElement[] = [];
      const delays: number[] = [];
      let restoreSnapshot: ImageData | null = null;

      for (let i = 0; i < decoded.length; i++) {
        const frame = decoded[i];

        if (i > 0) {
          const prev = decoded[i - 1];
          if (prev.disposalType === 2) {
            fullCtx.clearRect(
              prev.dims.left,
              prev.dims.top,
              prev.dims.width,
              prev.dims.height
            );
          } else if (prev.disposalType === 3 && restoreSnapshot) {
            fullCtx.putImageData(restoreSnapshot, 0, 0);
          }
        }

        // Capture ANTES de desenhar pra que disposalType=3 funcione no próximo
        if (frame.disposalType === 3) {
          restoreSnapshot = fullCtx.getImageData(0, 0, w, h);
        }

        // Threshold de alpha: GIFs nativos têm alpha binário (0 ou 255), mas
        // qualquer semi-transparência residual da decodificação vira borda
        // visível ao escalar/blend. Força alpha estritamente binário.
        tempCanvas.width = frame.dims.width;
        tempCanvas.height = frame.dims.height;
        const patchData = tempCtx.createImageData(
          frame.dims.width,
          frame.dims.height
        );
        const src = frame.patch;
        const dst = patchData.data;
        for (let p = 0; p < src.length; p += 4) {
          dst[p] = src[p];
          dst[p + 1] = src[p + 1];
          dst[p + 2] = src[p + 2];
          dst[p + 3] = src[p + 3] >= 128 ? 255 : 0;
        }
        tempCtx.putImageData(patchData, 0, 0);
        fullCtx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);

        const snap = document.createElement('canvas');
        snap.width = w;
        snap.height = h;
        snap.getContext('2d')!.drawImage(fullCanvas, 0, 0);
        composed.push(snap);
        delays.push(frame.delay || 100);
      }

      if (cancelled) return;

      // Canvas display em pixels físicos (DPR-aware), com scaling via drawImage
      // interno em vez de CSS-scaling do canvas attribute. Isso evita o halo
      // que aparece quando o browser interpola bilinearmente pixels de borda
      // (alpha 255) contra pixels vazios (alpha 0) durante o CSS resize.
      await new Promise((r) => requestAnimationFrame(r));
      if (cancelled) return;

      const cssWidth = canvas.clientWidth || 204;
      const aspectRatio = h / w;
      const cssHeight = cssWidth * aspectRatio;
      canvas.style.height = `${cssHeight}px`;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.globalCompositeOperation = 'source-over';

      // Loop de render com ping-pong: avança idx até o último, inverte
      // direção, avança até o primeiro, inverte de novo. Respeita o delay
      // de cada frame (gifuct-js retorna em ms).
      let idx = 0;
      let direction: 1 | -1 = 1;
      let last = performance.now();

      const paint = (n: number) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(composed[n], 0, 0, w, h, 0, 0, canvas.width, canvas.height);
      };

      paint(0);

      const tick = (now: number) => {
        if (cancelled) return;
        if (now - last >= delays[idx]) {
          last = now;
          idx += direction;
          if (pingPong) {
            if (idx >= composed.length - 1) {
              idx = composed.length - 1;
              direction = -1;
            } else if (idx <= 0) {
              idx = 0;
              direction = 1;
            }
          } else if (idx >= composed.length) {
            idx = 0;
          }
          paint(idx);
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    })().catch((err) => {
      console.error('[FlyingScene] failed to load GIF', err);
    });

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [src, pingPong]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        width: '100%',
        display: 'block',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    />
  );
}
