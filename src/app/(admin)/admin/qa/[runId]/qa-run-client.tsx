"use client";

import { useState, useCallback, useRef, useEffect, startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { ChecklistItem } from "@/lib/qa/checklist";
import { saveRunResults, finalizeRun } from "../actions";

type ItemResult = { status: string; note: string };
type SaveState = "idle" | "saving" | "saved" | "error";
type EditedField = string | "notes" | null;

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
  done: "☑️",
  pending: "⬜",
};

const SAVED_INDICATOR_TIMEOUT_MS = 2000;
const AUTOSAVE_DEBOUNCE_MS = 1000;

export function QARunClient({ run, checklist, sections }: Props) {
  const router = useRouter();
  const [results, setResults] = useState<Record<string, ItemResult>>(run.results);
  const [notes, setNotes] = useState(run.notes);
  const [eventId, setEventId] = useState("");
  const [slug, setSlug] = useState("joseeleticia");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastEditedField, setLastEditedField] = useState<EditedField>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalized, setFinalized] = useState(Boolean(run.finishedAt));
  const [leaving, setLeaving] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failuresRef = useRef(0);
  const hydratedRef = useRef(false);

  const localStorageKey = `qa-run-${run.id}`;

  const total = checklist.length;
  const statuses = Object.values(results);
  const okCount = statuses.filter((r) => r.status === "ok").length;
  const bugCount = statuses.filter((r) => r.status === "bug").length;
  const skipCount = statuses.filter((r) => r.status === "skip").length;
  const doneCount = statuses.filter((r) => r.status === "done").length;
  const tested = okCount + bugCount + skipCount + doneCount;

  const scheduleAutosave = useCallback(
    (nextResults: Record<string, ItemResult>, nextNotes: string, field: EditedField) => {
      if (finalized) return;
      if (field !== null) setLastEditedField(field);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaveState("saving");
        try {
          await saveRunResults(run.id, nextResults, nextNotes);
          failuresRef.current = 0;
          try {
            window.localStorage.removeItem(localStorageKey);
          } catch {
            // localStorage may be unavailable (private mode, quota); ignore
          }
          setSaveState("saved");
          savedFadeRef.current = setTimeout(
            () => setSaveState("idle"),
            SAVED_INDICATOR_TIMEOUT_MS,
          );
        } catch {
          failuresRef.current += 1;
          try {
            window.localStorage.setItem(
              localStorageKey,
              JSON.stringify({
                results: nextResults,
                notes: nextNotes,
                savedAt: new Date().toISOString(),
              }),
            );
          } catch {
            // localStorage may be unavailable; nothing else we can do
          }
          setSaveState("error");
          if (failuresRef.current >= 3) {
            toast.error(
              "Falha ao salvar a execução 3 vezes seguidas. Suas alterações ficam guardadas no navegador e voltam ao recarregar.",
            );
            failuresRef.current = 0;
          }
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [run.id, finalized, localStorageKey],
  );

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    let parsed: { results?: Record<string, ItemResult>; notes?: string } | null = null;
    try {
      const raw = window.localStorage.getItem(localStorageKey);
      if (raw) parsed = JSON.parse(raw);
    } catch {
      // ignore corrupt localStorage entries
    }
    if (!parsed) return;
    const recoveredResults = parsed.results;
    const recoveredNotes = typeof parsed.notes === "string" ? parsed.notes : undefined;
    startTransition(() => {
      if (recoveredResults) setResults(recoveredResults);
      if (recoveredNotes !== undefined) setNotes(recoveredNotes);
    });
    toast.info("Alterações não sincronizadas foram recuperadas do navegador.");
    if (!finalized) {
      scheduleAutosave(
        recoveredResults ?? results,
        recoveredNotes ?? notes,
        null,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
    };
  }, []);

  function setItemStatus(id: string, status: string) {
    setResults((prev) => {
      const next = {
        ...prev,
        [id]: { status, note: prev[id]?.note ?? "" },
      };
      scheduleAutosave(next, notes, id);
      return next;
    });
  }

  function setItemNote(id: string, note: string) {
    setResults((prev) => {
      const next = {
        ...prev,
        [id]: { status: prev[id]?.status ?? "pending", note },
      };
      scheduleAutosave(next, notes, id);
      return next;
    });
  }

  function updateNotes(value: string) {
    setNotes(value);
    scheduleAutosave(results, value, "notes");
  }

  function buildUrl(url: string) {
    const resolved = url.replace("[eventId]", eventId || "[eventId]").replace("[slug]", slug || "[slug]");
    return `https://joseeleticia.com${resolved}`;
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function flushPendingSave() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (finalized) return;
    setSaveState("saving");
    try {
      await saveRunResults(run.id, results, notes);
      try {
        window.localStorage.removeItem(localStorageKey);
      } catch {
        // ignore
      }
      setSaveState("saved");
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
      savedFadeRef.current = setTimeout(
        () => setSaveState("idle"),
        SAVED_INDICATOR_TIMEOUT_MS,
      );
    } catch {
      try {
        window.localStorage.setItem(
          localStorageKey,
          JSON.stringify({
            results,
            notes,
            savedAt: new Date().toISOString(),
          }),
        );
      } catch {
        // ignore
      }
      setSaveState("error");
      throw new Error("save failed");
    }
  }

  async function handleFinalize() {
    setFinalizing(true);
    try {
      await flushPendingSave();
    } catch {
      // continue to finalize even if last save failed; localStorage holds data
    }
    await finalizeRun(run.id);
    setFinalized(true);
    setFinalizing(false);
  }

  async function handleSaveAndExit() {
    setLeaving(true);
    try {
      await flushPendingSave();
    } catch {
      toast.error("Não foi possível salvar antes de sair. Os dados ficam guardados no navegador.");
      setLeaving(false);
      return;
    }
    router.push("/admin/qa");
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
          {saveState === "saving" && <span>Salvando...</span>}
          {saveState === "saved" && <span className="text-green-700">Salvo ✓</span>}
          {saveState === "error" && (
            <span className="text-red-600">Erro ao salvar — guardado no navegador</span>
          )}
          {finalized && <span className="text-green-700 font-medium">Finalizado</span>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-32">
        <div className="bg-background rounded-xl border border-border px-5 py-4 mb-6">
          <div className="mb-4">
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

          <div className="flex flex-wrap gap-4 text-sm mb-3">
            <span className="text-muted-foreground">
              {tested}/{total} testados
            </span>
            <span className="text-green-700 font-medium">✅ {okCount} OK</span>
            <span className="text-red-600 font-medium">⚠️ {bugCount} Bug{bugCount !== 1 ? "s" : ""}</span>
            <span className="text-muted-foreground">⏭️ {skipCount} Pulados</span>
            <span className="text-emerald-800 font-medium">☑️ {doneCount} Concluídos</span>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground mb-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-input"
            />
            Mostrar itens concluídos {doneCount > 0 && <span>({doneCount})</span>}
          </label>

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
          const sectionItems = checklist.filter((i) => i.section === section);
          const items = sectionItems.filter((item) => {
            const status = results[item.id]?.status ?? "pending";
            return showDone || status !== "done";
          });
          if (items.length === 0) return null;
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

                  if (status === "done" && !isExpanded) {
                    return (
                      <div
                        key={item.id}
                        className="bg-background rounded-xl border border-border px-4 py-2 flex items-center gap-3 opacity-70"
                      >
                        <span className="text-base leading-none">☑️</span>
                        <p className="font-medium text-sm flex-1 truncate">{item.title}</p>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(item.id)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                          ▼ Reabrir
                        </button>
                      </div>
                    );
                  }

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
                              onClick={() => setItemStatus(item.id, "done")}
                              disabled={finalized}
                              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                                status === "done"
                                  ? "bg-emerald-100 text-emerald-900 border border-emerald-400"
                                  : "bg-muted text-muted-foreground hover:bg-emerald-50 hover:text-emerald-800"
                              }`}
                            >
                              ☑️ Concluído
                            </button>
                            <button
                              onClick={() => toggleExpanded(item.id)}
                              className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {isExpanded ? "▲ Ocultar" : "▼ Detalhes"}
                            </button>
                          </div>

                          {(status !== "pending" || note) && (
                            <div className="mb-2">
                              <textarea
                                value={note}
                                onChange={(e) => setItemNote(item.id, e.target.value)}
                                disabled={finalized}
                                placeholder="Observação (opcional)..."
                                rows={2}
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50"
                              />
                              <div className="flex items-center justify-between gap-2 mt-1">
                                <span
                                  className={`text-[11px] ${
                                    lastEditedField === item.id && saveState === "saving"
                                      ? "text-muted-foreground"
                                      : lastEditedField === item.id && saveState === "saved"
                                      ? "text-green-700"
                                      : lastEditedField === item.id && saveState === "error"
                                      ? "text-red-600"
                                      : "opacity-0"
                                  }`}
                                >
                                  {lastEditedField === item.id && saveState === "saving" && "Salvando..."}
                                  {lastEditedField === item.id && saveState === "saved" && "Salvo ✓"}
                                  {lastEditedField === item.id && saveState === "error" &&
                                    "Erro ao salvar — guardado no navegador, vou tentar de novo"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLastEditedField(item.id);
                                    flushPendingSave().catch(() => {
                                      // erro já cai em saveState="error"
                                    });
                                  }}
                                  disabled={finalized || saveState === "saving"}
                                  className="text-[11px] rounded-md border border-border px-2 py-0.5 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  Salvar
                                </button>
                              </div>
                            </div>
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
          <div className="flex items-center justify-between gap-2 mt-1">
            <span
              className={`text-[11px] ${
                lastEditedField === "notes" && saveState === "saving"
                  ? "text-muted-foreground"
                  : lastEditedField === "notes" && saveState === "saved"
                  ? "text-green-700"
                  : lastEditedField === "notes" && saveState === "error"
                  ? "text-red-600"
                  : "opacity-0"
              }`}
            >
              {lastEditedField === "notes" && saveState === "saving" && "Salvando..."}
              {lastEditedField === "notes" && saveState === "saved" && "Salvo ✓"}
              {lastEditedField === "notes" && saveState === "error" &&
                "Erro ao salvar — guardado no navegador, vou tentar de novo"}
            </span>
            <button
              type="button"
              onClick={() => {
                setLastEditedField("notes");
                flushPendingSave().catch(() => {
                  // erro já cai em saveState="error"
                });
              }}
              disabled={finalized || saveState === "saving"}
              className="text-[11px] rounded-md border border-border px-2 py-0.5 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/qa/${run.id}/relatorio`}
            className="flex-1 min-w-[140px] text-center rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            📋 Gerar relatório
          </Link>
          <button
            type="button"
            onClick={handleFinalize}
            disabled={finalized || finalizing || leaving}
            className="flex-1 min-w-[160px] rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {finalizing ? "Finalizando..." : "✅ Finalizar execução"}
          </button>
          <button
            type="button"
            onClick={handleSaveAndExit}
            disabled={leaving || finalizing}
            className="flex-1 min-w-[140px] rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {leaving ? "Salvando..." : "💾 Salvar e voltar"}
          </button>
        </div>
      </div>
    </div>
  );
}
