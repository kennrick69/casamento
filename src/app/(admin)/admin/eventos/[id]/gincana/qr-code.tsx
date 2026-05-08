"use client";

import { useEffect, useState } from "react";

export function QRCode({ value, size = 120 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(value, {
        width: size,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      }).then(setDataUrl).catch(() => null);
    });
  }, [value, size]);

  if (!dataUrl) return <div className="bg-muted rounded animate-pulse" style={{ width: size, height: size }} />;
  return <img src={dataUrl} alt={`QR: ${value}`} width={size} height={size} className="rounded" />;
}
