import type { Metadata } from 'next';
import { LandingClient } from '@/components/landing/LandingClient';

export const metadata: Metadata = {
  title: 'Voem. — Convites interativos de casamento',
  description:
    'Crie o convite digital do seu casamento. RSVP, mural de fotos, playlist colaborativa e muito mais — tudo em um link.',
  openGraph: {
    title: 'Voem. — Convites interativos de casamento',
    description:
      'Crie o convite digital do seu casamento. RSVP, mural de fotos, playlist e muito mais.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voem. — Convites interativos de casamento',
    description:
      'Crie o convite digital do seu casamento. RSVP, mural de fotos, playlist e muito mais.',
  },
};

export default function HomePage() {
  return <LandingClient />;
}
