"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

type Template = "classico" | "rustico" | "minimal";

const TEMPLATES: { id: Template; label: string; description: string; preview: string }[] = [
  { id: "classico", label: "Clássico", description: "Fundo bordô com detalhes dourados", preview: "bg-rose-900" },
  { id: "rustico", label: "Rústico", description: "Tons terrosos, ambiente acolhedor", preview: "bg-amber-900" },
  { id: "minimal", label: "Minimalista", description: "Preto com acento bordô", preview: "bg-stone-900" },
];

interface Props {
  eventId: string;
  coupleNames: string;
  ceremonyDate: string;
  guestCount: number;
}

export function SaveTheDateClient({ eventId, coupleNames, ceremonyDate, guestCount }: Props) {
  const [template, setTemplate] = useState<Template>("classico");
  const [loading, setLoading] = useState(false);

  const dateStr = new Date(ceremonyDate).toLocaleDateString("pt-BR", {
    day: "numeric", month: "long", year: "numeric",
  });

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/eventos/${eventId}/save-the-date`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Erro ao gerar PDFs.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `save-the-date-${eventId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${guestCount} PDFs gerados com sucesso!`);
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (guestCount === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
          <p className="font-semibold">{coupleNames}</p>
          <p className="text-sm text-muted-foreground">{dateStr}</p>
        </div>
        <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-center space-y-3">
          <Users size={32} className="mx-auto text-amber-700" />
          <div>
            <p className="font-semibold text-amber-900">Nenhum convidado cadastrado</p>
            <p className="text-sm text-amber-800 mt-1">
              O save-the-date é gerado a partir da lista de convidados — cada PDF traz nome
              personalizado e QR code próprio. Cadastre os convidados primeiro.
            </p>
          </div>
          <Link
            href={`/admin/eventos/${eventId}/convidados`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Users size={16} />
            Ir para convidados
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event summary */}
      <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
        <p className="font-semibold">{coupleNames}</p>
        <p className="text-sm text-muted-foreground">{dateStr}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {guestCount} convidado{guestCount !== 1 ? "s" : ""} (pendentes + confirmados)
        </p>
      </div>

      {/* Template selector */}
      <div>
        <p className="text-sm font-semibold mb-3">Escolha o template visual</p>
        <div className="grid grid-cols-3 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                template === t.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className={`h-16 rounded-lg mb-2 ${t.preview} flex items-center justify-center`}>
                <span className="text-white text-xs opacity-75">A5</span>
              </div>
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* What's included */}
      <div className="rounded-lg bg-muted/40 border p-4 text-sm space-y-1">
        <p className="font-medium">Cada PDF inclui:</p>
        <ul className="text-muted-foreground space-y-0.5 list-disc list-inside">
          <li>Nome do convidado personalizado</li>
          <li>Nome do casal e data do casamento</li>
          <li>Local da cerimônia (se cadastrado)</li>
          <li>QR code exclusivo → link direto para o RSVP do convidado</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-2">Formato A5 paisagem (148×210mm). Todos os PDFs em um único arquivo ZIP.</p>
      </div>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={loading}
        size="lg"
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin mr-2" />
            Gerando {guestCount} PDFs… (pode demorar)
          </>
        ) : (
          <>
            <FileDown size={16} className="mr-2" />
            Gerar e baixar ZIP com {guestCount} save-the-date{guestCount !== 1 ? "s" : ""}
          </>
        )}
      </Button>
    </div>
  );
}
