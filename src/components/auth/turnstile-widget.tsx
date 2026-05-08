"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// Estado global compartilhado entre instâncias (script carrega uma vez)
let scriptLoaded = false;
const pendingRenders: (() => void)[] = [];

function onScriptLoad() {
  scriptLoaded = true;
  pendingRenders.forEach((fn) => fn());
  pendingRenders.length = 0;
}

interface Props {
  onToken: (token: string | null) => void;
}

export function TurnstileWidget({ onToken }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Ref garante que sempre chamamos a versão atual de onToken sem re-montar
  const onTokenRef = useRef(onToken);
  useEffect(() => { onTokenRef.current = onToken; });

  useEffect(() => {
    if (!SITE_KEY) return;

    function render() {
      const tw = (window as typeof window & { turnstile?: { render: (el: HTMLElement, opts: object) => string; remove: (id: string) => void } }).turnstile;
      if (!tw || !containerRef.current || widgetIdRef.current !== null) return;
      widgetIdRef.current = tw.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
      });
    }

    if (scriptLoaded) {
      render();
    } else {
      pendingRenders.push(render);
    }

    return () => {
      const tw = (window as typeof window & { turnstile?: { remove: (id: string) => void } }).turnstile;
      if (widgetIdRef.current !== null && tw) {
        tw.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="lazyOnload"
        onLoad={onScriptLoad}
      />
      <div className="flex justify-center">
        <div ref={containerRef} />
      </div>
    </>
  );
}
