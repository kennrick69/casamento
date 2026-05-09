"use client";

import { useState, useTransition } from "react";
import { saveThankYou, markThankYouSent } from "./actions";
import { CheckCircle, Circle, Clipboard } from "lucide-react";

interface GuestRow {
  id: string;
  name: string;
  giftReceived: string | null;
  thankYouNote: string | null;
  thankYouSent: boolean;
}

interface Props {
  eventId: string;
  coupleNames: string;
  guests: GuestRow[];
}

const TEMPLATE = (name: string, gift: string, couple: string) =>
  `Querido(a) ${name},\n\nFoi muito especial ter você no nosso casamento! Obrigado pelo ${gift || "presente"}, foi um carinho incrível e ficamos muito felizes com a sua presença.\n\nCom amor,\n${couple}`;

export function AgradecimentosClient({ eventId, coupleNames, guests }: Props) {
  const [rows, setRows] = useState(guests);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { gift: string; note: string }>>({});
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = rows.filter((r) => {
    if (filter === "pending") return !r.thankYouSent;
    if (filter === "done") return r.thankYouSent;
    return true;
  });

  const getEdit = (g: GuestRow) => edits[g.id] ?? { gift: g.giftReceived ?? "", note: g.thankYouNote ?? "" };

  function generateNote(g: GuestRow) {
    const { gift } = getEdit(g);
    return TEMPLATE(g.name, gift, coupleNames);
  }

  async function copyNote(g: GuestRow) {
    const note = getEdit(g).note || generateNote(g);
    await navigator.clipboard.writeText(note);
    setCopied(g.id);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleSave(g: GuestRow, sent: boolean) {
    const { gift, note } = getEdit(g);
    startTransition(async () => {
      void await saveThankYou(eventId, g.id, gift, note || generateNote(g), sent);
      setRows((prev) =>
        prev.map((r) => r.id === g.id ? { ...r, giftReceived: gift || null, thankYouNote: note || null, thankYouSent: sent } : r)
      );
      if (sent) setExpanded(null);
    });
  }

  function handleToggleSent(g: GuestRow) {
    startTransition(async () => {
      void await markThankYouSent(eventId, g.id, !g.thankYouSent);
      setRows((prev) => prev.map((r) => r.id === g.id ? { ...r, thankYouSent: !r.thankYouSent } : r));
    });
  }

  const done = rows.filter((r) => r.thankYouSent).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
      <div className="bg-background rounded-lg border border-border px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{done}/{rows.length} agradecimentos enviados</p>
          <div className="h-1.5 w-48 bg-muted rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${rows.length ? (done / rows.length) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div className="flex gap-1">
          {(["all", "pending", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"
              }`}
            >
              {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : "Enviados"}
            </button>
          ))}
        </div>
      </div>

      {filtered.map((g) => {
        const isExpanded = expanded === g.id;
        const edit = getEdit(g);
        const note = edit.note || generateNote(g);

        return (
          <div key={g.id} className="bg-background rounded-lg border border-border overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30"
              onClick={() => setExpanded(isExpanded ? null : g.id)}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleSent(g); }}
                  className={g.thankYouSent ? "text-green-500" : "text-muted-foreground hover:text-green-500"}
                  title={g.thankYouSent ? "Marcar como pendente" : "Marcar como enviado"}
                >
                  {g.thankYouSent ? <CheckCircle size={18} /> : <Circle size={18} />}
                </button>
                <div>
                  <p className="text-sm font-medium">{g.name}</p>
                  {g.giftReceived && (
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{g.giftReceived}</p>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{isExpanded ? "▲" : "▼"}</span>
            </div>

            {isExpanded && (
              <div className="border-t px-4 py-4 flex flex-col gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Presente recebido</label>
                  <input
                    type="text"
                    value={edit.gift}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [g.id]: { ...edit, gift: e.target.value } }))}
                    placeholder="Ex: jogo de panelas, viagem, etc."
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Mensagem de agradecimento</label>
                  <textarea
                    value={edit.note || generateNote(g)}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [g.id]: { ...edit, note: e.target.value } }))}
                    rows={6}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none font-sans"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => copyNote(g)}
                    className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted"
                  >
                    <Clipboard size={12} />
                    {copied === g.id ? "Copiado!" : "Copiar"}
                  </button>
                  <button
                    onClick={() => handleSave(g, false)}
                    disabled={isPending}
                    className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
                  >
                    Salvar rascunho
                  </button>
                  <button
                    onClick={() => handleSave(g, true)}
                    disabled={isPending}
                    className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle size={12} />
                    Marcar como enviado
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {filter === "pending" ? "Nenhum agradecimento pendente. 🎉" : "Nenhum agradecimento enviado ainda."}
        </p>
      )}
    </div>
  );
}
