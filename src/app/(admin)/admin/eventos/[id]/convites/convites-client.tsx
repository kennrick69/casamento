"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FileDown, Ban, RotateCcw, Ticket } from "lucide-react";
import { generateBlankBatch, invalidateCode } from "./actions";

export interface CodeRow {
  id: string;
  code: string;
  batchLabel: string | null;
  maxCompanions: number;
  status: "free" | "used" | "invalid";
  claimant: string | null;
  claimedAt: string | null;
}

const STATUS_LABEL: Record<CodeRow["status"], string> = {
  free: "Livre",
  used: "Usado",
  invalid: "Invalidado",
};
const STATUS_CLASS: Record<CodeRow["status"], string> = {
  free: "bg-green-100 text-green-800",
  used: "bg-blue-100 text-blue-800",
  invalid: "bg-gray-200 text-gray-600",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

export function ConvitesClient({ eventId, rows }: { eventId: string; rows: CodeRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [count, setCount] = useState(20);
  const [maxCompanions, setMaxCompanions] = useState(4);
  const [label, setLabel] = useState("");

  const free = rows.filter((r) => r.status === "free").length;
  const used = rows.filter((r) => r.status === "used").length;

  function onGenerate() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("count", String(count));
      fd.set("maxCompanions", String(maxCompanions));
      if (label.trim()) fd.set("label", label.trim());
      const r = await generateBlankBatch(fd);
      if (r.ok) toast.success(`${r.count} código${r.count === 1 ? "" : "s"} gerado${r.count === 1 ? "" : "s"}.`);
      else toast.error(r.message);
    });
  }

  function onInvalidate(row: CodeRow) {
    const makeInvalid = row.status !== "invalid";
    if (makeInvalid && !window.confirm(`Invalidar o código ${row.code}? Ele deixa de funcionar.`)) return;
    startTransition(async () => {
      const r = await invalidateCode(eventId, row.id, makeInvalid);
      if (r.ok) toast.success(makeInvalid ? "Código invalidado." : "Código reativado.");
      else toast.error(r.message);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Ticket className="size-5" aria-hidden /> Convites impressos
        </h2>
        <p className="text-sm text-muted-foreground">
          Códigos EM BRANCO para imprimir (QR no envelope). Quem escaneia cria o próprio cadastro na
          lista. Os convidados da lista têm código pessoal na aba Convidados.
        </p>
      </div>

      {/* Gerar lote */}
      <div className="rounded-lg border border-border bg-background p-4 flex flex-col gap-3">
        <p className="font-medium text-sm">Gerar novo lote</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Quantidade
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="h-10 w-24 px-2 rounded-md border border-border bg-background text-sm text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Acompanhantes por código
            <input
              type="number"
              min={0}
              max={10}
              value={maxCompanions}
              onChange={(e) => setMaxCompanions(Number(e.target.value))}
              className="h-10 w-24 px-2 rounded-md border border-border bg-background text-sm text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground flex-1 min-w-[140px]">
            Rótulo do lote (opcional)
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex.: Família, Trabalho…"
              maxLength={60}
              className="h-10 px-2 rounded-md border border-border bg-background text-sm text-foreground"
            />
          </label>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isPending}
            className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {isPending ? "Gerando…" : "Gerar lote"}
          </button>
        </div>
      </div>

      {/* Resumo + PDF */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} código{rows.length !== 1 ? "s" : ""} impresso{rows.length !== 1 ? "s" : ""} ·{" "}
          {free} livre{free !== 1 ? "s" : ""} · {used} usado{used !== 1 ? "s" : ""}
        </p>
        {free > 0 && (
          <a
            href={`/api/admin/eventos/${eventId}/convites/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted"
          >
            <FileDown className="size-4" aria-hidden /> Baixar PDF ({free} livres)
          </a>
        )}
      </div>

      {/* Lista */}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum código impresso ainda. Gere um lote acima.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
              <code className="font-mono font-semibold tracking-wider text-sm">{r.code}</code>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_CLASS[r.status]}`}>
                {STATUS_LABEL[r.status]}
              </span>
              {r.batchLabel && <span className="text-xs text-muted-foreground">· {r.batchLabel}</span>}
              {r.status === "used" && r.claimant && (
                <span className="text-xs text-muted-foreground truncate">
                  por {r.claimant}
                  {r.claimedAt ? ` em ${fmtDate(r.claimedAt)}` : ""}
                </span>
              )}
              {r.status !== "used" && (
                <button
                  type="button"
                  onClick={() => onInvalidate(r)}
                  disabled={isPending}
                  className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                  title={r.status === "invalid" ? "Reativar" : "Invalidar"}
                >
                  {r.status === "invalid" ? (
                    <><RotateCcw className="size-3.5" aria-hidden /> reativar</>
                  ) : (
                    <><Ban className="size-3.5" aria-hidden /> invalidar</>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
