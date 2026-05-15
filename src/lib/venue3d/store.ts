import { create } from 'zustand';
import type { Venue3D, Venue3DObject, Venue3DAvatar } from '@prisma/client';

type EditorMode = 'view' | 'place' | 'edit';

interface Venue3DState {
  venue: (Venue3D & { objects: Venue3DObject[]; avatars: Venue3DAvatar[] }) | null;
  selectedObjectId: string | null;
  mode: EditorMode;

  setVenue: (venue: Venue3DState['venue']) => void;
  setSelectedObjectId: (id: string | null) => void;
  setMode: (mode: EditorMode) => void;
  addObject: (obj: Venue3DObject) => void;
  updateObject: (id: string, patch: Partial<Venue3DObject>) => void;
  removeObject: (id: string) => void;
}

export const useVenue3DStore = create<Venue3DState>((set) => ({
  venue: null,
  selectedObjectId: null,
  mode: 'view',

  setVenue: (venue) => set({ venue }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  setMode: (mode) => set({ mode }),

  addObject: (obj) =>
    set((s) =>
      s.venue ? { venue: { ...s.venue, objects: [...s.venue.objects, obj] } } : s
    ),

  updateObject: (id, patch) =>
    set((s) =>
      s.venue
        ? {
            venue: {
              ...s.venue,
              objects: s.venue.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
            },
          }
        : s
    ),

  removeObject: (id) =>
    set((s) =>
      s.venue
        ? { venue: { ...s.venue, objects: s.venue.objects.filter((o) => o.id !== id) } }
        : s
    ),
}));
