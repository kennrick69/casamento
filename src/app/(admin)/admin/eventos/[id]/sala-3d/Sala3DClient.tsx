'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import type { Venue3D, Venue3DObject, Venue3DAvatar } from '@prisma/client';
import { useVenue3DStore } from '@/lib/venue3d/store';

const Sala3DCanvas = dynamic(() => import('./Sala3DCanvas'), { ssr: false });

type VenueWithRelations = Venue3D & { objects: Venue3DObject[]; avatars: Venue3DAvatar[] };

interface Props {
  venue: VenueWithRelations;
  eventId: string;
}

export function Sala3DClient({ venue, eventId }: Props) {
  const setVenue = useVenue3DStore((s) => s.setVenue);

  useEffect(() => {
    setVenue(venue);
  }, [venue, setVenue]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg overflow-hidden border border-border" style={{ height: 520 }}>
        <Sala3DCanvas venue={venue} eventId={eventId} />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          {venue.objects.length} objeto{venue.objects.length !== 1 ? 's' : ''} no salão
          · {venue.floorWidthTiles}×{venue.floorDepthTiles} tiles
        </span>
        <span>Arraste para rotacionar · Scroll para zoom</span>
      </div>
    </div>
  );
}
