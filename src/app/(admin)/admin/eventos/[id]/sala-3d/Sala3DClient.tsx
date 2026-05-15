'use client';

import dynamic from 'next/dynamic';
import type { Venue3D, Venue3DObject, Venue3DAvatar } from '@prisma/client';

const Sala3DCanvas = dynamic(() => import('./Sala3DCanvas'), { ssr: false });

interface Props {
  venue: Venue3D & { objects: Venue3DObject[]; avatars: Venue3DAvatar[] };
  eventId: string;
}

export function Sala3DClient({ venue, eventId }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg overflow-hidden border border-border" style={{ height: 520 }}>
        <Sala3DCanvas venue={venue} eventId={eventId} />
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Editor de salão 3D voxel — em construção
      </p>
    </div>
  );
}
