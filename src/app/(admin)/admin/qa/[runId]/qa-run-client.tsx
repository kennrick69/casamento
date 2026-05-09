"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ChecklistItem } from "@/lib/qa/checklist";
import { saveRunResults, finalizeRun } from "../actions";

type ItemResult = { status: string; note: string };

interface RunData {
  id: string;
  title: string;
  startedAt: string;
  finishedAt: string | null;
  results: Record<string, ItemResult>;
  notes: string;
}

interface Props {
  run: RunData;
  checklist: ChecklistItem[];
  sections: string[];
}

const STATUS_ICONS: Record<string, string> = {
  ok: "✅",
  bug: "⚠️",
  skip: "⏭️",
  pending: "⬜",
};

export function QARunClient({ run, checklist, sections }: Props) {
  const [results, setResults] = useState<Record<string, ItemResult>>(run.results);
  const [notes, setNotes] = useState(run.notes);
  const [eventId, setEventId] = useState("");
  const [slug, setSlug] = useState("joseeleticia");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalized, setFinalized] = useState(Boolean(run.finishedAt));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = checklist.length;
  const statuses = Object.values(results);
  const okCount = statuses.filter((r) => r.status === "ok").length;
  const bugCount = statuses.filter((r) => r.status === "bug").length;
  const skipCount = statuses.filter((r) => r.status === "skip").length;
  const tested = okCount + bugCount + skipCount;

  const scheduleAutosave = useCallback(
    (nextResults: Record<string, ItemResult>, nextNotes: string) => {
      if (finalized) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaving(true);
        await saveRunResults(run.id, nextResults, nextNotes);
        setSaving(false);
      }, 800);
    },
    [run.id, finalized],
  );

  function setItemStatus(id: string, status: string) {
    setResults((prev) => {
      const next = {
        ...prev,
        [id]: { status, note: prev[id]?.note ?? "" },
      };
      scheduleAutosave(next, notes);
      return next;
    });
  }

  function setItemNote(id: string, note: string) {
    setResults((prev) => {
      const next = {
        ...prev,
        [id]: { status: prev[id]?.status ?? "pending", note },
      };
      scheduleAutosave(next, notes);
      return next;
    });
  }

  function updateNotes(value: string) {
    setNotes(value);
    scheduleAutosave(results, value);
  }

  function buildUrl(url: string) {
    const resolved = url.replace("[eventId]", eventId || "[eventId]").replace("[slug]", slug || "[slug]");
    return `https://joseeleticia.com${resolved}`;
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleFinalize() {
    setFinalizing(true);
    await finalizeRun(run.id);
    setFinalized(true);
    setFinalizing(false);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/qa" className="text-sm text-muted-foreground hover:text-foreground">
            ← QA Dashboard
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-semibold">{run.title}</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saving && <span>Salvando...</span>}
          {finalized && <span className="text-green-700 font-medium">Finalizado</span>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-background rounded-xl border border-border px-5 py-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Iniciado em{" "}
                {format(new Date(run.startedAt), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              {run.finishedAt && (
                <p className="text-xs text-muted-foreground">
                  Finalizado em{" "}
                  {format(new Date(run.finishedAt), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/admin/qa/${run.id}/relatorio`}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                Gerar relatório
              </Link>
              <button
                onClick={handleFinalize}
                disabled={finalized || finalizing}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {finalizing ? "Finalizando..." : "Finalizar execução"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm mb-3">
            <span className="text-muted-foreground">
              {tested}/{total} testados
            </span>
            <span className="text-green-700 font-medium">✅ {okCount} OK</span>
            <span className="text-red-600 font-medium">⚠️ {bugCount} Bug{bugCount !== 1 ? "s" : ""}</span>
            <span className="text-muted-foreground">⏭️ {skipCount} Pulados</span>
          </div>

          <div className="w-full bg-muted rounded-full h-2 mb-4">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${total > 0 ? (tested / total) * 100 : 0}%` }}
            />
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Substituição de placeholders nas URLs
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Esses valores substituem <code className="bg-muted px-1 rounded">[eventId]</code> e{" "}
              <code className="bg-muted px-1 rounded">[slug]</code> nos links abaixo
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">ID do evento</label>
                <input
                  type="text"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  placeholder="ex: cm1abc123"
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-52"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Slug do evento</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="joseeleticia"
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-40"
                />
              </div>
            </div>
          </div>
        </div>

        {sections.map((section) => {
          const items = checklist.filter((i) => i.section === section);
          return (
            <div key={section} className="mb-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {section}
              </h2>
              <div className="flex flex-col gap-2">
                {items.map((item) => {
                  const result = results[item.id];
                  const status = result?.status ?? "pending";
                  const note = result?.note ?? "";
                  const isExpanded = expanded[item.id] ?? false;
                  const resolvedUrl = buildUrl(item.url);

                  return (
                    <div
                      key={item.id}
                      className="bg-background rounded-xl border border-border px-5 py-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg leading-none mt-0.5">{STATUS_ICONS[status]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-medium text-sm">{item.title}</p>
                            <a
                              href={resolvedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline shrink-0 font-mono"
                            >
                              🔗 Abrir
                            </a>
                          </div>

                          <p className="text-xs text-muted-foreground font-mono mb-3 break-all">
                            {resolvedUrl}
                          </p>

                          <div className="flex gap-2 mb-3">
                            <button
                              onClick={() => setItemStatus(item.id, "ok")}
                              disabled={finalized}
                              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                                status === "ok"
                                  ? "bg-green-100 text-green-800 border border-green-300"
                                  : "bg-muted text-muted-foreground hover:bg-green-50 hover:text-green-700"
                              }`}
                            >
                              ✅ OK
                            </button>
                            <button
                              onClick={() => setItemStatus(item.id, "bug")}
                              disabled={finalized}
                              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                                status === "bug"
                                  ? "bg-red-100 text-red-800 border border-red-300"
                                  : "bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-700"
                              }`}
                            >
                              ⚠️ Bug
                            </button>
                            <button
                              onClick={() => setItemStatus(item.id, "skip")}
                              disabled={finalized}
                              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                                status === "skip"
                                  ? "bg-slate-200 text-slate-700 border border-slate-300"
                                  : "bg-muted text-muted-foreground hover:bg-slate-100"
                              }`}
                            >
                              ⏭️ Pulei
                            </button>
                            <button
                              onClick={() => toggleExpanded(item.id)}
                              className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {isExpanded ? "▲ Ocultar" : "▼ Detalhes"}
                            </button>
                          </div>

                          {(status !== "pending" || note) && (
                            <textarea
                              value={note}
                              onChange={(e) => setItemNote(item.id, e.target.value)}
                              disabled={finalized}
                              placeholder="Observação (opcional)..."
                              rows={2}
                              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50 mb-2"
                            />
                          )}

                          {isExpanded && (
                            <div className="border-t border-border pt-3 mt-1">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">
                                Passos
                              </p>
                              <ol className="list-decimal list-inside space-y-1 mb-3">
                                {item.steps.map((step, i) => (
                                  <li key={i} className="text-xs text-muted-foreground">
                                    {step}
                                  </li>
                                ))}
                              </ol>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">
                                Resultado esperado
                              </p>
                              <p className="text-xs text-muted-foreground">{item.expected}</p>
                              {item.knownIssues && item.knownIssues.length > 0 && (
                                <>
                                  <p className="text-xs font-semibold text-muted-foreground mt-2 mb-1">
                                    Problemas conhecidos
                                  </p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {item.knownIssues.map((issue, i) => (
                                      <li key={i} className="text-xs text-yellow-700">
                                        {issue}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="bg-background rounded-xl border border-border px-5 py-4 mb-6">
          <h2 className="font-medium mb-2">Notas gerais da execução</h2>
          <textarea
            value={notes}
            onChange={(e) => updateNotes(e.target.value)}
            disabled={finalized}
            placeholder="Observações gerais sobre esta execução de testes..."
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50"
          />
        </div>
      </main>
    </div>
  );
}
