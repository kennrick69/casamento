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
      canvas.width = w;
      canvas.height = h;

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

        tempCanvas.width = frame.dims.width;
        tempCanvas.height = frame.dims.height;
        const patchData = tempCtx.createImageData(
          frame.dims.width,
          frame.dims.height
        );
        patchData.data.set(frame.patch);
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

      // Loop de render com ping-pong: avança idx até o último, inverte
      // direção, avança até o primeiro, inverte de novo. Respeita o delay
      // de cada frame (gifuct-js retorna em ms).
      let idx = 0;
      let direction: 1 | -1 = 1;
      let last = performance.now();

      ctx.drawImage(composed[0], 0, 0);

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
          ctx.drawImage(composed[idx], 0, 0);
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
        height: 'auto',
        display: 'block',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    />
  );
}
