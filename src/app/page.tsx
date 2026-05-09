import type { Metadata } from "next";
import { ProtoScene } from "@/components/landing/ProtoScene";

export const metadata: Metadata = {
  title: "Voem. — Convites interativos de casamento",
  description:
    "Crie o convite digital do seu casamento. RSVP, mural de fotos, playlist colaborativa e muito mais — tudo em um link.",
  openGraph: {
    title: "Voem. — Convites interativos de casamento",
    description: "Crie o convite digital do seu casamento. RSVP, mural de fotos, playlist e muito mais.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Voem. — Convites interativos de casamento",
    description: "Crie o convite digital do seu casamento. RSVP, mural de fotos, playlist e muito mais.",
  },
};

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111111",
        padding: "24px 16px",
      }}
    >
      <ProtoScene />
    </div>
  );
}
