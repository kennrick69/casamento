import type { Metadata } from "next";
import { ProtoScene } from "@/components/landing/ProtoScene";

export const metadata: Metadata = {
  title: "Voem. — Convites digitais de casamento",
  description:
    "A plataforma gratuita para criar o convite digital do casamento dos seus sonhos.",
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
