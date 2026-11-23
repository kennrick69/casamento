import Link from "next/link";
import { Check, AlertTriangle, Circle, ChevronRight } from "lucide-react";
import type { EventReadiness, ReadinessItem } from "@/lib/event/readiness";

// Card "Progresso do casamento" no Dashboard. Mostra a prontidão pela jornada do
// jogador (ver lib/event/readiness) com barra 0→100%, alertas de "mina terrestre"
// (NPC já fala sobre algo vazio/exemplo) e a lista agrupada com links diretos.

function ItemRow({ item }: { item: ReadinessItem }) {
  const done = item.status === "done";
  const warn = item.status === "warn";
  const Icon = done ? Check : warn ? AlertTriangle : Circle;
  const iconColor = done
    ? "text-green-600"
    : warn
      ? "text-amber-500"
      : item.required
        ? "text-red-500"
        : "text-muted-foreground";

  return (
    <Link
      href={item.href}
      className="group flex items-start gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 transition-colors hover:bg-muted"
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={`text-sm font-medium ${done ? "" : "text-foreground"}`}>{item.label}</span>
          {typeof item.count === "number" && (
            <span className="text-xs text-muted-foreground tabular-nums">({item.count})</span>
          )}
          {!item.required && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              opcional
            </span>
          )}
          {item.landmine && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
              {item.npc ? `${item.npc} fala disso` : "atenção"}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{item.hint}</span>
      </span>
      <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
    </Link>
  );
}

export function ConfigProgress({ readiness }: { readiness: EventReadiness }) {
  const { percent, requiredDone, requiredTotal, landmines, published, groups } = readiness;
  const complete = percent >= 100;

  const barColor = complete ? "bg-green-600" : percent >= 60 ? "bg-amber-500" : "bg-red-500";

  return (
    <section className="mb-6 rounded-xl border border-border bg-background p-4 sm:p-5">
      {/* Cabeçalho + barra */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Progresso do casamento</h2>
          <p className="text-xs text-muted-foreground">
            {complete
              ? "Tudo pronto para enviar os convites! 🎉"
              : `${requiredDone} de ${requiredTotal} itens essenciais prontos`}
          </p>
        </div>
        <span className={`text-2xl font-bold tabular-nums ${complete ? "text-green-700" : "text-foreground"}`}>
          {percent}%
        </span>
      </div>
      <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${percent}%` }} />
      </div>

      {/* Aviso: publicado mas incompleto */}
      {published && !complete && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            O evento já está <strong>publicado e no ar</strong>, mas ainda faltam itens. Os convidados
            podem encontrar fases vazias. Complete os itens em vermelho antes de divulgar.
          </span>
        </div>
      )}

      {/* Minas terrestres: NPC já fala de algo vazio/exemplo */}
      {landmines.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-red-700">
            <AlertTriangle className="size-4" aria-hidden /> Bonecos falando de conteúdo que não existe
          </p>
          <ul className="flex flex-col gap-1.5">
            {landmines.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="flex items-center gap-1.5 text-xs text-red-800 hover:underline">
                  <span className="font-medium">{item.npc ?? item.label}</span>
                  <span className="text-red-600">— {item.label}</span>
                  <ChevronRight className="size-3.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grupos pela jornada */}
      <div className="flex flex-col gap-4">
        {groups.map((group) => {
          const groupDone = group.items.filter((i) => i.status === "done").length;
          return (
            <div key={group.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</h3>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {groupDone}/{group.items.length}
                </span>
              </div>
              {group.subtitle && <p className="mb-2 text-xs text-muted-foreground">{group.subtitle}</p>}
              <div className="flex flex-col gap-1.5">
                {group.items.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
