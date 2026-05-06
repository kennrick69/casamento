import Image from "next/image";
import { storage } from "@/lib/storage";

interface LandingHeroProps {
  coupleNames: string;
  coverImageKey: string | null;
  paletteColors: Record<string, string> | null;
}

export async function LandingHero({
  coupleNames,
  coverImageKey,
  paletteColors,
}: LandingHeroProps) {
  const hasCover = coverImageKey
    ? await storage.exists(coverImageKey)
    : false;

  const primary = paletteColors?.primary ?? "var(--theme-primary)";
  const accent = paletteColors?.accent ?? "var(--theme-accent)";

  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: "56vw", maxHeight: "480px" }}>
      {hasCover && coverImageKey ? (
        <Image
          src={storage.getUrl(coverImageKey)}
          alt={coupleNames}
          fill
          className="object-cover"
          priority
        />
      ) : (
        // Gradiente baseado na paleta do tema — fallback enquanto não há foto de capa
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${primary}22 0%, ${accent}44 50%, ${primary}33 100%)`,
            backgroundColor: "var(--theme-background)",
          }}
        >
          {/* Padrão decorativo sutil */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, ${accent} 0%, transparent 50%),
                               radial-gradient(circle at 75% 75%, ${primary} 0%, transparent 50%)`,
            }}
          />
        </div>
      )}

      {/* Overlay com gradiente pra legibilidade do texto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {/* Nomes dos noivos */}
      <div className="absolute bottom-0 inset-x-0 p-6 text-center">
        <h1
          className="text-3xl sm:text-4xl font-semibold text-white drop-shadow-md leading-tight"
          style={{ fontFamily: "var(--theme-font-heading)" }}
        >
          {coupleNames}
        </h1>
      </div>
    </div>
  );
}
