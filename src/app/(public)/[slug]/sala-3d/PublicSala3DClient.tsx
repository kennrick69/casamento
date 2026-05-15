'use client';

import dynamic from 'next/dynamic';
import type { Venue3D, Venue3DObject } from '@prisma/client';

const PublicSala3DCanvas = dynamic(() => import('./PublicSala3DCanvas'), { ssr: false });

interface Props {
  venue: Venue3D & { objects: Venue3DObject[] };
  coupleNames: string;
}

export function PublicSala3DClient({ venue, coupleNames }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg overflow-hidden border border-border" style={{ height: 480 }}>
        <PublicSala3DCanvas venue={venue} />
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Edição: {coupleNames} · {venue.objects.length} objeto{venue.objects.length !== 1 ? 's' : ''} · {venue.floorWidthTiles}×{venue.floorDepthTiles} tiles
      </p>
    </div>
  );
}
