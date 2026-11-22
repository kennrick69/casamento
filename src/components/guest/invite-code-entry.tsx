"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ScanLine, X } from "lucide-react";
import { normalizeCode } from "@/lib/invite/normalize";

// Entrada por código na abertura do jogo (S4a): "Tenho um código" (campo) e
// "Escanear QR code" (câmera: BarcodeDetector nativo, com fallback jsQR
// vendorizado em /vendor/jsqr.js). Sem câmera → só o campo.

// Extrai o código de um conteúdo de QR (URL .../c/<CODE> ou o código puro) e já
// normaliza (sem hífen/espaço, maiúsculo) — mesma regra do servidor.
function extractCode(text: string): string {
  const m = text.match(/\/c\/([^/?#\s]+)/i);
  return normalizeCode(m ? m[1] : text);
}

type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => {
  detect(src: CanvasImageSource): Promise<{ rawValue: string }[]>;
};
interface JsQRResult {
  data: string;
}
type JsQRFn = (data: Uint8ClampedArray, w: number, h: number) => JsQRResult | null;

function loadJsQR(): Promise<JsQRFn | null> {
  return new Promise((resolve) => {
    const w = window as unknown as { jsQR?: JsQRFn };
    if (w.jsQR) return resolve(w.jsQR);
    const s = document.createElement("script");
    s.src = "/vendor/jsqr.js";
    s.onload = () => resolve(w.jsQR ?? null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

// Press Start 2P é all-caps e NÃO tem "Ó" maiúsculo (só o "ó" minúsculo), então
// "código" sai como "CóDIGO". Em textos nessa fonte, usar sem acento ("codigo").
const PIXEL = "var(--font-press-start), ui-monospace, monospace";

export function InviteCodeEntry({ slug }: { slug: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "code" | "scan">("idle");
  const [code, setCode] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  function go(rawCode: string) {
    const c = normalizeCode(rawCode); // aceita com/sem hífen, espaços e minúsculas
    if (!c) return;
    router.push(`/${slug}/c/${c}`);
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Liga/desliga a câmera conforme o modo "scan".
  useEffect(() => {
    if (mode !== "scan") {
      stopCamera();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => {});

        const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
        const detector = Ctor ? new Ctor({ formats: ["qr_code"] }) : null;
        const jsqr = detector ? null : await loadJsQR();
        if (!detector && !jsqr) {
          setScanError("Seu navegador não lê QR aqui. Digite o código ou use a câmera do celular.");
          return;
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          const v = videoRef.current;
          if (v.readyState >= 2 && v.videoWidth > 0) {
            try {
              if (detector) {
                const found = await detector.detect(v);
                if (found[0]?.rawValue) return go(extractCode(found[0].rawValue));
              } else if (jsqr && ctx) {
                canvas.width = v.videoWidth;
                canvas.height = v.videoHeight;
                ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const res = jsqr(img.data, img.width, img.height);
                if (res?.data) return go(extractCode(res.data));
              }
            } catch {
              /* frame ruim; tenta o próximo */
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setScanError("Não consegui abrir a câmera. Digite o código abaixo.");
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div className="w-full border-t pt-3" style={{ borderColor: "rgba(107,74,42,0.3)" }}>
      <p className="mb-2 text-xs" style={{ color: "#6b4a2a", fontFamily: "var(--font-lora), Georgia, serif" }}>
        Recebeu um convite impresso?
      </p>

      {mode === "idle" && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("code")}
            className="flex items-center justify-center gap-1.5 px-2 py-2"
            style={{ fontFamily: PIXEL, fontSize: "8px", lineHeight: 1.4, color: "#3a2a1a", background: "#efe0bf", border: "2px solid #6b4a2a" }}
          >
            <KeyRound className="size-3.5" aria-hidden /> Tenho um codigo
          </button>
          <button
            type="button"
            onClick={() => { setScanError(null); setMode("scan"); }}
            className="flex items-center justify-center gap-1.5 px-2 py-2"
            style={{ fontFamily: PIXEL, fontSize: "8px", lineHeight: 1.4, color: "#3a2a1a", background: "#efe0bf", border: "2px solid #6b4a2a" }}
          >
            <ScanLine className="size-3.5" aria-hidden /> Escanear QR code
          </button>
        </div>
      )}

      {mode === "code" && (
        <form
          onSubmit={(e) => { e.preventDefault(); go(code); }}
          className="flex flex-col gap-2"
        >
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Seu código (ex.: ABCD-2345)"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={16}
            className="w-full h-11 px-3 rounded-md border-2 text-sm tracking-widest text-center"
            style={{ borderColor: "#6b4a2a", background: "#fff8e8", color: "#3a2a1a", fontFamily: "ui-monospace, monospace" }}
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("idle")} className="text-xs underline" style={{ color: "#6b4a2a" }}>
              voltar
            </button>
            <button
              type="submit"
              disabled={!code.trim()}
              className="ml-auto flex items-center justify-center px-4 py-2 disabled:opacity-50"
              style={{ fontFamily: PIXEL, fontSize: "10px", color: "#ffeec2", background: "#6b4a2a", border: "2px solid #2a1d12" }}
            >
              ENTRAR
            </button>
          </div>
        </form>
      )}

      {mode === "scan" && (
        <div className="flex flex-col gap-2">
          <div className="relative w-full overflow-hidden rounded-md border-2" style={{ borderColor: "#6b4a2a", background: "#000", aspectRatio: "1 / 1" }}>
            <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => setMode("idle")}
              aria-label="Fechar scanner"
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          {scanError && <p className="text-xs" style={{ color: "#8a2f24" }}>{scanError}</p>}
          <button type="button" onClick={() => setMode("code")} className="text-xs underline self-center" style={{ color: "#6b4a2a" }}>
            Prefiro digitar o código
          </button>
        </div>
      )}
    </div>
  );
}
