# HeartFlightTransition v2 — pixel art edition

Componente React que executa a sequência:
**união das mãos → coração pixel 16-bit nasce → bate → power-up grow → SNAP → voo**

Estética: Mario power-up. Coração pixel 16-bit (15×13 px, 3 cores), crescimento em steps discretos, ciclo de 5 paletas de cor, transição final instantânea com explosão de partículas pixel.

## O que mudou da v1

| v1 | v2 |
|---|---|
| Coração SVG suave (curvas Bézier) | Coração pixel 16-bit (15×13 retângulos) |
| Crescimento contínuo com easing | 6 steps discretos sem easing |
| 1 cor que faz crossfade | 5 paletas ciclando (vermelho→dourado→teal→roxo→rosa) |
| Crossfade lento entre cenas (400ms) | SNAP instantâneo (1 frame) |
| Sem partículas | 32 partículas pixel explodem no snap |
| ~2s total | ~1.6s total |

## Substituir o componente

O arquivo `HeartFlightTransition.tsx` é uma substituição direta do anterior — **mesma interface de props**, só muda o visual interno.

A única coisa que sumiu: a constante `COLORS` exportada (antes você precisava ajustar `heartEnd` pra casar com a cor do céu do voo). Como agora a transição é SNAP, não tem mais "costura" pra esconder — o coração simplesmente some no frame em que o voo aparece.

## Uso

```tsx
import HeartFlightTransition from '@/components/landing/HeartFlightTransition';

export default function LandingPage() {
  const [handsUnited, setHandsUnited] = useState(false);
  const [showInviteBtn, setShowInviteBtn] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <HeartFlightTransition
        trigger={handsUnited}
        fallingScene={
          <FallingScene onHandsUnited={() => setHandsUnited(true)} />
        }
        flyingScene={
          <FlyingScene
            src="/landing/casal-voando-transparente.gif"
            backgroundColor="#FFD4B8"
          />
        }
        onFlightStart={() => {
          setTimeout(() => setShowInviteBtn(true), 800);
        }}
      />
    </div>
  );
}
```

## Props

Iguais à v1 — mesma API.

| Prop | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `trigger` | `boolean` | sim | Quando vira `true`, dispara a sequência. |
| `fallingScene` | `ReactNode` | sim | Cena da queda livre. |
| `flyingScene` | `ReactNode` | sim | Cena do voo. |
| `onFlightStart` | `() => void` | não | Disparado quando entra na fase SNAP_FLYING. |
| `onPhaseChange` | `(phase: Phase) => void` | não | Callback em cada mudança de fase. |
| `heartOrigin` | `{ x: string; y: string }` | não | Origem do coração. Default `{ x: '50%', y: '42%' }`. |

## Tuning

### Timing

Todos os tempos em `TIMING` no topo do arquivo:

```ts
const TIMING = {
  unionPause: 200,    // pausa após mãos unidas
  popStep: 80,        // cada step do "nascimento" (3 steps)
  beatExpand: 120,    // expansão de cada batida
  beatContract: 180,  // contração de cada batida
  beatCount: 3,       // quantas batidas
  growStep: 110,      // cada step do power-up grow (6 steps)
  particleDuration: 600, // duração das partículas
};
// Total: ~1.6s do trigger até SNAP_FLYING
```

### Cores do power-up

`POWER_UP_PALETTES` — array de 5 paletas. Mexa nos hex pra criar outro mood:

```ts
const POWER_UP_PALETTES = [
  { dark: '#C71B2E', mid: '#FF3B5C', light: '#FFB3C0' }, // vermelho
  { dark: '#B8860B', mid: '#FFD700', light: '#FFF59D' }, // dourado
  { dark: '#0B7B5F', mid: '#22D3A8', light: '#A7F3D0' }, // teal
  { dark: '#6B21A8', mid: '#A855F7', light: '#E9D5FF' }, // roxo
  { dark: '#A04050', mid: '#FFB8C8', light: '#FFE0E8' }, // rosa final
];
```

Cada paleta tem 3 cores (dark = borda, mid = preenchimento, light = brilho).

### Steps do crescimento

`GROW_STEPS` define a curva de crescimento. Atualmente 6 steps de scale 2 → 32. Pra ficar mais dramático:

```ts
const GROW_STEPS = [
  { scale: 2,  paletteIdx: 0 },
  { scale: 5,  paletteIdx: 1 },
  { scale: 12, paletteIdx: 2 },
  { scale: 25, paletteIdx: 3 },
  { scale: 45, paletteIdx: 4 },
];
```

### Partículas

`PARTICLE_COUNT = 32` no topo. Mais = mais drama, mas pesa mais em mobile fraco. Sweet spot é 24-32.

## Estados (state machine)

```
IDLE → UNION_PAUSE → HEART_BIRTH → HEART_BEAT → POWER_UP_GROW → SNAP_FLYING
```

A transição **não tem reset automático**. Quando entra em SNAP_FLYING, fica. Pra rodar de novo, remonte o componente com `key={n}`.

## Acessibilidade

- Respeita `prefers-reduced-motion`: vai direto pra SNAP_FLYING sem animação
- `aria-live` anuncia "O casal está voando feliz" pra screen readers
- `aria-hidden` em todos os elementos decorativos (coração, partículas)

## Performance

- Coração é SVG com `transform: scale()` (composited na GPU)
- Sem transição CSS na escala — os steps discretos são naturalmente performáticos
- Partículas usam `transform` puro, máximo 32 elementos efêmeros
- `shape-rendering="crispEdges"` mantém os pixels nítidos em qualquer escala
- `image-rendering: pixelated` no SVG e nas partículas

## Notas técnicas

### Por que não usar CSS animations?

Tentado, descartado. CSS `@keyframes` quer interpolar entre keyframes, e isso quebra a estética "step discreto". Setar `animation-timing-function: steps(1)` funciona mas vira um inferno pra cancelar a animação no meio (ex: usuário sai da página). O loop assíncrono com `setTimeout` permite cancelamento limpo via `cancelledRef`.

### Por que SNAP em vez de crossfade?

Crossfade entre 2 cenas precisa que ambas tenham mesma cor de fundo na borda, senão aparece costura visível. Com SNAP, a troca acontece no frame em que o coração toma a tela toda — o usuário enxerga só o coração no momento da troca, então não importa que os fundos sejam diferentes.

### iOS Safari

O componente em si não tem gotchas no iOS. Mas se `flyingScene` for um `<video>`:
- Sempre use `muted + playsInline + autoPlay` (sem os três, trava no iOS)
- Considere usar GIF em vez de MP4 — playback mais previsível
