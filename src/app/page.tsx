import type { Metadata } from "next";
import { SkyLanding } from "@/components/home/sky-landing";

export const metadata: Metadata = {
  title: "Voem. — Convites digitais de casamento",
  description:
    "A plataforma gratuita para criar o convite digital do casamento dos seus sonhos.",
};

export default function HomePage() {
  return <SkyLanding />;
}
