"use client";

import { useState, useEffect } from "react";
import { Share2, Link2, Check, X } from "lucide-react";
import QRCode from "qrcode";

interface Props {
  slug: string;
  coupleNames: string;
  eventUrl: string;
}

export function ShareSection({ slug, coupleNames, eventUrl }: Props) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(eventUrl, { width: 280, margin: 2, errorCorrectionLevel: "M" })
      .then(setQrDataUrl)
      .catch(() => null);
  }, [eventUrl]);

  function logShare(platform: string) {
    fetch(`/api/public/${slug}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    }).catch(() => null);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      logShare("copy");
    } catch { /* ignore */ }
  }

  function handleWhatsApp() {
    // wa.me é o universal link oficial recomendado; api.whatsapp.com/send é
    // legado e às vezes redireciona pra splash screen no desktop.
    // Quebra de linha dupla entre mensagem e URL ajuda o WhatsApp a renderizar
    // preview rico do link em vez de tratar tudo como texto colado.
    const text = `Você está convidado para o casamento de ${coupleNames}!\n\n${eventUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    logShare("whatsapp");
  }

  return (
    <section className="px-4 py-6 border-b border-[var(--theme-border)]">
      <div className="flex items-center gap-2 text-[var(--theme-foreground)] mb-4">
        <Share2 size={18} className="text-[var(--theme-secondary)]" />
        <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--theme-font-heading)" }}>
          Compartilhar
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {/* WhatsApp */}
        <button
          onClick={handleWhatsApp}
          className="flex items-center gap-3 w-full rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] px-4 py-3 text-sm font-medium hover:opacity-80 transition-opacity text-left"
        >
          <span className="text-[#25D366] text-lg leading-none">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </span>
          Compartilhar no WhatsApp
        </button>

        {/* Copy link */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-3 w-full rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] px-4 py-3 text-sm font-medium hover:opacity-80 transition-opacity text-left"
        >
          {copied ? <Check size={18} className="text-green-500" /> : <Link2 size={18} className="text-[var(--theme-secondary)]" />}
          {copied ? "Link copiado!" : "Copiar link do convite"}
        </button>

        {/* QR code */}
        {qrDataUrl && (
          <button
            onClick={() => setShowQr(true)}
            className="flex items-center gap-3 w-full rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] px-4 py-3 text-sm font-medium hover:opacity-80 transition-opacity text-left"
          >
            <span className="text-[var(--theme-secondary)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/>
                <rect x="19" y="14" width="2" height="2" rx="0.5"/><rect x="19" y="18" width="2" height="3" rx="0.5"/>
                <rect x="14" y="19" width="3" height="2" rx="0.5"/>
              </svg>
            </span>
            Mostrar QR code
          </button>
        )}
      </div>

      {/* QR modal */}
      {showQr && qrDataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowQr(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4 max-w-xs w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full">
              <p className="font-semibold text-gray-900 text-sm">QR Code do convite</p>
              <button onClick={() => setShowQr(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <img src={qrDataUrl} alt="QR Code" width={240} height={240} className="rounded-lg" />
            <p className="text-xs text-gray-500 text-center">
              Aponte a câmera do celular para abrir o convite
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
