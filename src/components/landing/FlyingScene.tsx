'use client';

/**
 * FlyingScene
 * -----------
 * GIF do casal voando, usado pelo HeartFlightTransition após a fase
 * SKY_CROSSFADE. Loop é controlado pelo próprio GIF (se foi criado
 * em ping-pong, faz ping-pong; se foi forward, faz forward).
 *
 * Briefing — tarefa 2:
 *  - 100% × 100%, objectFit: cover
 *  - draggable={false} + pointer-events:none + userSelect:none
 *    para não capturar interação acidental
 *
 * Usa `<img>` (e não `<Image>` do next/image) porque o componente Image
 * só anima GIFs com `unoptimized`, eliminando todos os ganhos da CDN.
 *
 * Uso:
 *   <FlyingScene src="/landing/casalvoando.gif" />
 */

type Props = {
  src: string;
};

export function FlyingScene({ src }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    />
  );
}
