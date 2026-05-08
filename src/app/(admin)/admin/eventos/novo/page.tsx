import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createEventBasic } from "./actions";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Novo evento" };

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

        <div className="flex gap-2 mb-8 text-xs font-mono">
          {["1 Básico", "2 Local", "3 Tema", "4 Publicar"].map((s, i) => (
            <span
              key={s}
              className={`px-3 py-1 rounded-full ${
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </span>
          ))}
        </div>

        <div className="bg-background rounded-lg border border-border p-6">
          <h1 className="text-xl font-semibold mb-6">Dados básicos</h1>
          <form action={createEventBasic} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupleNames">Nome do casal</Label>
              <Input
                id="coupleNames"
                name="coupleNames"
                placeholder="Ana e Bruno"
                required
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ceremonyDate">Data da cerimônia</Label>
                <Input
                  id="ceremonyDate"
                  name="ceremonyDate"
                  type="date"
                  required
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ceremonyTime">Horário</Label>
                <Input
                  id="ceremonyTime"
                  name="ceremonyTime"
                  type="time"
                  defaultValue="16:00"
                  required
                  className="h-11"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rsvpEarlyDeadline">
                Prazo limite para confirmação de presença
                <span className="ml-1 text-muted-foreground font-normal text-xs">(opcional)</span>
              </Label>
              <Input
                id="rsvpEarlyDeadline"
                name="rsvpEarlyDeadline"
                type="date"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Convidados que confirmarem antes desta data ganham pontos extras.
              </p>
            </div>

            <input type="hidden" name="timezone" value="America/Sao_Paulo" />

            <Button type="submit" className="h-11 mt-2">
              Próximo: Local →
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
