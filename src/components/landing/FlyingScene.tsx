'use client';

/**
 * FlyingScene
 * -----------
 * Player de vídeo (MP4) em loop com o casal voando, usado pelo
 * HeartFlightTransition após a fase SKY_CROSSFADE.
 *
 * Briefing — tarefa 2:
 *  - autoPlay, loop, muted, playsInline (CRÍTICO pra iOS)
 *  - objectFit: cover, 100% × 100%
 *
 * Briefing — tarefas 5 e 6 (warm-up + performance mobile):
 *  - preload="auto" pra cache antecipado
 *  - .load() + .play() preventivos no mount (a transição monta este
 *    componente em opacity 0 desde o início — quando aparecer, já está
 *    rodando, sem delay).
 *
 * Loop ping-pong (forward → reverse → forward → ...): implementado em JS
 * via manipulação de `currentTime`, pra cobrir iOS Safari (que não suporta
 * `playbackRate < 0`). Quando o vídeo termina, entra em modo "reverse"
 * controlado por requestAnimationFrame até voltar a 0; aí dá `play()` de
 * novo. Default: ligado. Se o asset já vier com ping-pong embutido no
 * próprio MP4 (ex: gerado via `ffmpeg -filter_complex "[0]reverse[r];[0][r]concat=..."`),
 * passar `pingPong={false}` e o loop nativo `<video loop>` cuida.
 *
 * Uso:
 *   <FlyingScene src="/casal-voando.mp4" />
 *   <FlyingScene src="/casal-voando.mp4" pingPong={false} />
 */

import { useEffect, useRef } from 'react';

type Props = {
  src: string;
  /** Imagem de poster opcional enquanto o vídeo carrega */
  poster?: string;
  /** Loop tipo ping-pong (forward → reverse). Default: true. */
  pingPong?: boolean;
};

export function FlyingScene({ src, poster, pingPong = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Warm-up: load + play preventivos
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    void v.play().catch(() => undefined);
  }, []);

  // Ping-pong loop manual
  useEffect(() => {
    if (!pingPong) return;
    const v = videoRef.current;
    if (!v) return;

    let direction: 1 | -1 = 1;
    let rafId = 0;
    let lastTimestamp = 0;

    function reverseTick(ts: number) {
      if (!v || direction !== -1) return;
      const delta = lastTimestamp ? (ts - lastTimestamp) / 1000 : 0;
      lastTimestamp = ts;
      const next = v.currentTime - delta;
      if (next <= 0) {
        v.currentTime = 0;
        direction = 1;
        lastTimestamp = 0;
        void v.play().catch(() => undefined);
        return;
      }
      v.currentTime = next;
      rafId = requestAnimationFrame(reverseTick);
    }

    function handleEnded() {
      if (!v) return;
      direction = -1;
      lastTimestamp = 0;
      v.pause();
      rafId = requestAnimationFrame(reverseTick);
    }

    v.addEventListener('ended', handleEnded);
    return () => {
      v.removeEventListener('ended', handleEnded);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [pingPong]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      autoPlay
      // Loop nativo só quando ping-pong está desligado.
      loop={!pingPong}
      muted
      playsInline
      preload="auto"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
}
