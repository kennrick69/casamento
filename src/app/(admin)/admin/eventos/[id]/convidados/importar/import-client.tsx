"use client";

import { useState, useRef } from "react";
import { parseRows, importGuests } from "./actions";
import type { ParsedRow, RowError, ImportResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Upload, Download, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";

const EXPECTED_COLS = ["nome", "email", "telefone", "grupo", "acompanhantes", "restricao_alimentar"];

type Step = "upload" | "preview" | "done";

interface ImportClientProps {
  eventId: string;
}

export function ImportClient({ eventId }: ImportClientProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [validRows, setValidRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<RowError[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"update" | "skip">("skip");
  const [ignoreErrors, setIgnoreErrors] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
    if (data.length === 0) { toast.error("Arquivo vazio ou sem dados."); return; }
    setRawRows(data);
    const { valid, errors } = await parseRows(data);
    setValidRows(valid);
    setParseErrors(errors);
    setStep("preview");
  }

  async function handleImport() {
    const toImport = ignoreErrors ? validRows : parseErrors.length > 0 ? null : validRows;
    if (!toImport) { toast.error("Corrija os erros antes de importar ou marque 'ignorar erros'."); return; }
    setLoading(true);
    try {
      const res = await importGuests(eventId, toImport, duplicateStrategy);
      setResult(res);
      setStep("done");
      toast.success(`Importação concluída: ${res.imported} novos, ${res.updated} atualizados`);
    } catch {
      toast.error("Erro ao importar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("upload");
    setRawRows([]);
    setValidRows([]);
    setParseErrors([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      {/* Template download */}
      <a
        href={`/api/admin/eventos/${eventId}/convidados/template`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
      >
        <Download size={14} /> Baixar planilha modelo (.csv)
      </a>

      {step === "upload" && (
        <div
          className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <Upload size={32} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Arraste um arquivo <strong>.csv</strong> ou <strong>.xlsx</strong> aqui,<br />
            ou clique para selecionar
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="flex gap-3 flex-wrap">
            <StatBadge icon={<CheckCircle size={14} />} label="Válidas" count={validRows.length} color="green" />
            <StatBadge icon={<XCircle size={14} />} label="Com erro" count={parseErrors.length} color="red" />
            <StatBadge icon={null} label="Total" count={rawRows.length} color="gray" />
          </div>

          {/* Column mapping hint */}
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
            <strong>Colunas esperadas:</strong> {EXPECTED_COLS.join(", ")}.<br />
            Colunas extras são ignoradas. Nomes são normalizados (minúsculo, sem espaços).
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-2 text-left w-12">#</th>
                  <th className="px-2 py-2 text-left">Nome</th>
                  <th className="px-2 py-2 text-left">E-mail</th>
                  <th className="px-2 py-2 text-left">Telefone</th>
                  <th className="px-2 py-2 text-left">+1</th>
                  <th className="px-2 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {validRows.slice(0, 10).map((row) => (
                  <tr key={row._rowNum} className="border-t">
                    <td className="px-2 py-1.5 text-muted-foreground">{row._rowNum}</td>
                    <td className="px-2 py-1.5">{row.nome}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{row.email}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{row.telefone || "—"}</td>
                    <td className="px-2 py-1.5">{row.acompanhantes}</td>
                    <td className="px-2 py-1.5"><span className="text-green-700 font-medium">✓ OK</span></td>
                  </tr>
                ))}
                {parseErrors.slice(0, 5).map((err) => (
                  <tr key={err._rowNum} className="border-t bg-red-50">
                    <td className="px-2 py-1.5 text-muted-foreground">{err._rowNum}</td>
                    <td className="px-2 py-1.5 text-red-700" colSpan={4}>{String(err.raw["nome"] ?? err.raw["Nome"] ?? "?")}</td>
                    <td className="px-2 py-1.5 text-red-600 text-xs">{err.error}</td>
                  </tr>
                ))}
                {(validRows.length + parseErrors.length) > 15 && (
                  <tr className="border-t">
                    <td colSpan={6} className="px-2 py-2 text-center text-xs text-muted-foreground">
                      + {(validRows.length + parseErrors.length) - 15} linhas não mostradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Error list */}
          {parseErrors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
                <AlertTriangle size={12} /> {parseErrors.length} linha(s) com erro
              </p>
              {parseErrors.map((e) => (
                <p key={e._rowNum} className="text-xs text-red-600">Linha {e._rowNum}: {e.error}</p>
              ))}
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ignoreErrors}
                  onChange={(e) => setIgnoreErrors(e.target.checked)}
                  className="rounded"
                />
                <span className="text-xs text-red-700">Ignorar erros e importar apenas as linhas válidas ({validRows.length})</span>
              </label>
            </div>
          )}

          {/* Duplicate strategy */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-xs font-semibold">E-mails duplicados (já cadastrados):</p>
            <div className="flex gap-4">
              {(["skip", "update"] as const).map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dup"
                    value={opt}
                    checked={duplicateStrategy === opt}
                    onChange={() => setDuplicateStrategy(opt)}
                  />
                  <span className="text-sm">
                    {opt === "skip" ? "Pular (manter dados existentes)" : "Atualizar (sobrescrever nome, telefone, +1)"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={reset} variant="outline" disabled={loading}>Voltar</Button>
            <Button
              onClick={handleImport}
              disabled={loading || (parseErrors.length > 0 && !ignoreErrors) || validRows.length === 0}
            >
              {loading ? "Importando…" : `Importar ${ignoreErrors ? validRows.length : rawRows.length - parseErrors.length} convidado(s)`}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <StatBadge icon={<CheckCircle size={14} />} label="Importados" count={result.imported} color="green" />
            <StatBadge icon={null} label="Atualizados" count={result.updated} color="blue" />
            <StatBadge icon={null} label="Pulados" count={result.skipped} color="gray" />
            <StatBadge icon={<XCircle size={14} />} label="Erros" count={result.errors.length} color="red" />
          </div>
          <div className="flex gap-3">
            <Button onClick={reset} variant="outline">Nova importação</Button>
            <a href="../convidados">
              <Button>Ver lista de convidados</Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBadge({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    gray: "bg-muted/50 text-muted-foreground border-border",
  };
  return (
    <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1 text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {icon}
      <span>{label}: <strong>{count}</strong></span>
    </div>
  );
}
