'use client';

import { useState } from 'react';
import HeartFlightTransition from '@/components/landing/HeartFlightTransition';
import { ProtoScene } from '@/components/landing/ProtoScene';
import { FlyingScene } from '@/components/landing/FlyingScene';

/**
 * Wrapper client da landing principal. Reage à união dos personagens
 * (drag do ProtoScene) → dispara a transição do coração → cena de voo
 * (casalvoando.gif).
 *
 * Importado pelo server component `src/app/page.tsx` (que exporta
 * `metadata` para SEO/OG).
 */
export function LandingClient() {
  const [united, setUnited] = useState(false);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111111',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '380px',
          height: '580px',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <HeartFlightTransition
          trigger={united}
          fallingScene={<ProtoScene onUnite={() => setUnited(true)} />}
          flyingScene={<FlyingScene src="/landing/casalvoando.gif" />}
        />
      </div>
    </div>
  );
}
