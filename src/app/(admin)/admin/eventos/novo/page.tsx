import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NovoWizardForm } from "./novo-wizard-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Novo evento" };

const STEPS = ["Dados básicos", "Local", "Tema visual", "Publicar"];

export default async function NovoEventoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            ← Meus eventos
          </Link>
        </div>

        <div className="flex gap-2 mb-3 text-xs font-medium flex-wrap">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`px-3 py-1.5 rounded-full ${
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1} {s}
            </span>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mb-8">Passo 1 de 4</p>

        <div className="bg-background rounded-lg border border-border p-6">
          <h1 className="text-xl font-semibold mb-6">Dados básicos</h1>
          <NovoWizardForm />
        </div>
      </div>
    </div>
  );
}
