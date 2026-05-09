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

  // Sem foto de capa: hero compacto pra não empurrar o conteúdo (countdown,
  // RSVP, padrinhos) pra muito longe na primeira dobra. Com foto: hero alto
  // pra valorizar a imagem.
  const heightStyle = hasCover
    ? { minHeight: "56vw", maxHeight: "480px" }
    : { minHeight: "180px", maxHeight: "260px" };

  return (
    <div className="relative w-full overflow-hidden" style={heightStyle}>
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

      {/* Overlay com gradiente pra legibilidade do texto (apenas com foto) */}
      {hasCover && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      )}

      {/* Nomes dos noivos — centralizados verticalmente quando não há foto */}
      <div
        className={
          hasCover
            ? "absolute bottom-0 inset-x-0 p-6 text-center"
            : "absolute inset-0 flex items-center justify-center px-6 text-center"
        }
      >
        <h1
          className={`text-3xl sm:text-4xl font-semibold leading-tight ${
            hasCover ? "text-white drop-shadow-md" : "text-[var(--theme-foreground)]"
          }`}
          style={{ fontFamily: "var(--theme-font-heading)" }}
        >
          {coupleNames}
        </h1>
      </div>
    </div>
  );
}
