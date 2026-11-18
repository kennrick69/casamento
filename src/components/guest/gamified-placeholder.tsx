import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Countdown } from "@/components/guest/countdown";
import { formatEventDate } from "@/lib/timezone";

// Placeholder "em construção" mostrado ao convidado quando o evento está no
// Modo Gamificado (Event.experienceType = GAMIFIED). O jogo RPG chega nos
// próximos sprints; por ora o convidado ainda consegue confirmar presença.
export function GamifiedPlaceholder({
  coupleNames,
  ceremonyDate,
  timezone,
  rsvpHref,
}: {
  coupleNames: string;
  ceremonyDate: Date;
  timezone: string;
  rsvpHref: string;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center gap-6">
      <p className="text-5xl" aria-hidden>
        🎮
      </p>
      <div className="flex flex-col gap-2">
        <h1
          className="text-2xl font-semibold text-[var(--theme-foreground)]"
          style={{ fontFamily: "var(--theme-font-heading)" }}
        >
          {coupleNames}
        </h1>
        <p className="text-sm text-[var(--theme-secondary)]">
          O convite em modo jogo está sendo preparado com muito carinho.
        </p>
      </div>

      <div
        className="rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] px-5 py-4 flex flex-col gap-3 max-w-sm w-full"
      >
        <span className="inline-flex items-center justify-center gap-2 text-xs uppercase tracking-wider text-[var(--theme-secondary)]">
          🚧 Em construção
        </span>
        <p className="text-sm text-[var(--theme-secondary)]">
          Em breve você vai poder explorar o nosso casamento como um joguinho. Enquanto isso, já
          pode confirmar sua presença.
        </p>
        <p className="text-xs text-[var(--theme-secondary)]">
          {formatEventDate(ceremonyDate, timezone, "EEEE, d 'de' MMMM 'de' yyyy")}
        </p>
        <Countdown targetDate={ceremonyDate} timezone={timezone} />
      </div>

      <Link
        href={rsvpHref}
        className={buttonVariants({ className: "h-12 px-6 text-base font-semibold justify-center" })}
      >
        Confirmar presença
      </Link>
    </div>
  );
}
