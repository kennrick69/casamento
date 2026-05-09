import { Suspense } from "react";
import type { Metadata } from "next";
import { MagicAuth } from "./magic-auth";

export const metadata: Metadata = { title: "Entrando..." };

export default function MagicAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      }
    >
      <MagicAuth />
    </Suspense>
  );
}
