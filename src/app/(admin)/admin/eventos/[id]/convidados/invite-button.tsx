"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageCircle, Mail, Check, Copy } from "lucide-react";
import { sendInviteEmail, markWhatsappSent } from "./invite-actions";

export interface InviteRow {
  code: string; // já formatado (ABCD-2345)
  personalLink: string;
  whatsappHref: string | null; // null se o convidado não tem telefone
  sentAt: string | null; // ISO
  sentChannel: "whatsapp" | "email" | null;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

const CHANNEL_LABEL: Record<"whatsapp" | "email", string> = {
  whatsapp: "WhatsApp",
  email: "Email",
};

export function InviteButton({
  eventId,
  guestId,
  row,
  hasEmail,
}: {
  eventId: string;
  guestId: string;
  row: InviteRow;
  hasEmail: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  // Estado local do marcador (otimista) — o server action revalida a página,
  // mas atualizamos na hora pra refletir o envio sem esperar o refresh.
  const [sentAt, setSentAt] = useState(row.sentAt);
  const [sentChannel, setSentChannel] = useState(row.sentChannel);

  // Confirmação de reenvio quando já foi disparado antes (qualquer canal).
  function confirmResend(): boolean {
    if (!sentAt) return true;
    const quando = fmtDate(sentAt);
    const canal = sentChannel ? CHANNEL_LABEL[sentChannel] : "convite";
    return window.confirm(`Já enviado em ${quando} por ${canal}. Enviar de novo?`);
  }

  function onWhatsapp() {
    if (!row.whatsappHref) return;
    if (!confirmResend()) return;
    window.open(row.whatsappHref, "_blank", "noopener,noreferrer");
    startTransition(async () => {
      const r = await markWhatsappSent(eventId, guestId);
      if (r.ok) {
        setSentAt(new Date().toISOString());
        setSentChannel("whatsapp");
        toast.success("Marcado como enviado por WhatsApp.");
      } else {
        toast.error(r.message);
      }
    });
  }

  function onEmail() {
    if (!hasEmail) {
      toast.error("Convidado sem e-mail válido.");
      return;
    }
    if (!confirmResend()) return;
    startTransition(async () => {
      const r = await sendInviteEmail(eventId, guestId);
      if (r.ok) {
        setSentAt(new Date().toISOString());
        setSentChannel("email");
        toast.success("Convite enviado por e-mail.");
      } else {
        toast.error(r.message);
      }
    });
  }

  function copyLink() {
    navigator.clipboard?.writeText(row.personalLink).then(
      () => toast.success("Link pessoal copiado."),
      () => toast.error("Não foi possível copiar.")
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/40 px-3 py-2 flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-muted-foreground">Código:</span>
        <code className="font-mono font-semibold tracking-wider bg-background border border-border rounded px-1.5 py-0.5">
          {row.code}
        </code>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          title="Copiar link pessoal"
        >
          <Copy className="size-3.5" aria-hidden /> copiar link
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onWhatsapp}
          disabled={isPending || !row.whatsappHref}
          title={row.whatsappHref ? "Abrir WhatsApp com a mensagem pronta" : "Convidado sem telefone"}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-green-200 bg-green-50 text-green-800 text-xs font-medium hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MessageCircle className="size-3.5" aria-hidden /> WhatsApp
        </button>
        <button
          type="button"
          onClick={onEmail}
          disabled={isPending || !hasEmail}
          title={hasEmail ? "Enviar convite por e-mail" : "Convidado sem e-mail válido"}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-blue-200 bg-blue-50 text-blue-800 text-xs font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mail className="size-3.5" aria-hidden /> Email
        </button>

        {sentAt && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3.5 text-green-600" aria-hidden />
            Enviado em {fmtDate(sentAt)}
            {sentChannel ? ` por ${CHANNEL_LABEL[sentChannel]}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}
