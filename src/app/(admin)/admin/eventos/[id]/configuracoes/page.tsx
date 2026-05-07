import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { EventNav } from "@/components/admin/event-nav";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  updateEventLocation,
  updateEventTheme,
  publishEvent,
  updateEventBasic,
  updateEventFeatures,
} from "./actions";
import { THEMES } from "@/lib/themes";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Configurações" };

const STEPS = ["1 Básico", "2 Local", "3 Tema", "4 Publicar"];

export default async function ConfiguracoesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const { step: stepStr } = await searchParams;
  const step = parseInt(stepStr ?? "0", 10) || 0;
  const isWizard = step > 0;

  try {
    await requireOrganizer(id);
  } catch {
    notFound();
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: { theme: true },
  });
  if (!event) notFound();

  const themes = await prisma.theme.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            ← Meus eventos
          </Link>
        </div>

        {isWizard && (
          <div className="flex gap-2 mb-8 text-xs font-mono flex-wrap">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`px-3 py-1 rounded-full ${
                  i + 1 === step
                    ? "bg-primary text-primary-foreground"
                    : i + 1 < step
                    ? "bg-green-100 text-green-800"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {!isWizard && <EventNav eventId={id} />}

        {(step === 0 || step === 1) && (
          <BasicForm event={event} isWizard={isWizard} />
        )}
        {step === 2 && <LocationForm event={event} />}
        {step === 3 && <ThemeForm event={event} themes={themes} />}
        {step === 4 && <PublishForm event={event} />}

        {step === 0 && (
          <>
            <LocationForm event={event} />
            <ThemeForm event={event} themes={themes} />
            <FeaturesForm event={event} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Formulário de dados básicos ───────────────────────────────────────────

function BasicForm({ event, isWizard }: { event: { id: string; coupleNames: string; ceremonyDate: Date; timezone: string; rsvpEarlyDeadline: Date | null }; isWizard: boolean }) {
  const dateStr = event.ceremonyDate.toISOString().split("T")[0];
  const timeStr = event.ceremonyDate.toISOString().split("T")[1]?.slice(0, 5) ?? "16:00";
  const deadlineStr = event.rsvpEarlyDeadline
    ? event.rsvpEarlyDeadline.toISOString().split("T")[0]
    : "";

  return (
    <div className="bg-background rounded-lg border border-border p-6 mb-6">
      <h2 className="text-base font-semibold mb-5">{isWizard ? "Dados básicos" : "Dados do evento"}</h2>
      <form action={isWizard ? undefined : updateEventBasic} className="flex flex-col gap-4">
        <input type="hidden" name="eventId" value={event.id} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coupleNames">Nome do casal</Label>
          <Input id="coupleNames" name="coupleNames" defaultValue={event.coupleNames} required className="h-11" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ceremonyDate">Data</Label>
            <Input id="ceremonyDate" name="ceremonyDate" type="date" defaultValue={dateStr} required className="h-11" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ceremonyTime">Horário</Label>
            <Input id="ceremonyTime" name="ceremonyTime" type="time" defaultValue={timeStr} required className="h-11" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rsvpEarlyDeadline">Prazo RSVP antecipado</Label>
          <Input id="rsvpEarlyDeadline" name="rsvpEarlyDeadline" type="date" defaultValue={deadlineStr} className="h-11" />
        </div>
        <input type="hidden" name="timezone" value={event.timezone} />
        {!isWizard && <Button type="submit" className="h-11">Salvar</Button>}
      </form>
    </div>
  );
}

// ── Formulário de local ───────────────────────────────────────────────────

function LocationForm({
  event,
}: {
  event: {
    id: string;
    ceremonyLocation: string | null;
    ceremonyAddress: string | null;
    receptionLocation: string | null;
    receptionAddress: string | null;
    mapsLink: string | null;
    dresscode: string | null;
  };
}) {
  return (
    <div className="bg-background rounded-lg border border-border p-6 mb-6">
      <h2 className="text-base font-semibold mb-5">Local</h2>
      <form action={updateEventLocation} className="flex flex-col gap-4">
        <input type="hidden" name="eventId" value={event.id} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ceremonyLocation">Local da cerimônia</Label>
          <Input id="ceremonyLocation" name="ceremonyLocation" defaultValue={event.ceremonyLocation ?? ""} placeholder="Igreja São João" className="h-11" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ceremonyAddress">Endereço da cerimônia</Label>
          <Input id="ceremonyAddress" name="ceremonyAddress" defaultValue={event.ceremonyAddress ?? ""} placeholder="Rua das Flores, 100 — São Paulo, SP" className="h-11" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="receptionLocation">Local da recepção</Label>
          <Input id="receptionLocation" name="receptionLocation" defaultValue={event.receptionLocation ?? ""} placeholder="Espaço Villa Eventos" className="h-11" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="receptionAddress">Endereço da recepção</Label>
          <Input id="receptionAddress" name="receptionAddress" defaultValue={event.receptionAddress ?? ""} className="h-11" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mapsLink">Link do Google Maps (opcional)</Label>
          <Input id="mapsLink" name="mapsLink" type="url" defaultValue={event.mapsLink ?? ""} placeholder="https://maps.google.com/..." className="h-11" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dresscode">Traje</Label>
          <Input id="dresscode" name="dresscode" defaultValue={event.dresscode ?? ""} placeholder="Passeio completo" className="h-11" />
        </div>
        <Button type="submit" className="h-11">Salvar local →</Button>
      </form>
    </div>
  );
}

// ── Seleção de tema ───────────────────────────────────────────────────────

function ThemeForm({
  event,
  themes,
}: {
  event: { id: string; theme: { key: string; name: string } };
  themes: { id: string; key: string; name: string }[];
}) {
  const themeColors: Record<string, string> = {
    rustic: "#7C5C3E",
    classic: "#2C2C2C",
    minimal: "#1A1A1A",
    boho: "#8B6356",
    beach: "#2E7D9A",
  };

  return (
    <div className="bg-background rounded-lg border border-border p-6 mb-6">
      <h2 className="text-base font-semibold mb-5">Tema visual</h2>
      <form action={updateEventTheme} className="flex flex-col gap-4">
        <input type="hidden" name="eventId" value={event.id} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {themes.map((theme) => {
            const themeData = THEMES.find((t) => t.key === theme.key);
            const color = themeData?.tokens.colors.primary ?? themeColors[theme.key] ?? "#1A1A1A";
            return (
              <label
                key={theme.id}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  event.theme.key === theme.key
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="themeKey"
                  value={theme.key}
                  defaultChecked={event.theme.key === theme.key}
                  className="sr-only"
                />
                <div
                  className="w-10 h-10 rounded-full"
                  style={{ background: color }}
                />
                <span className="text-xs text-center leading-tight">{theme.name}</span>
              </label>
            );
          })}
        </div>
        <Button type="submit" className="h-11">Salvar tema →</Button>
      </form>
    </div>
  );
}

// ── Funcionalidades ───────────────────────────────────────────────────────

function FeaturesForm({ event }: { event: { id: string; features: unknown } }) {
  const features = event.features as Record<string, boolean>;
  const featureList = [
    { key: "rsvp", label: "Confirmação de presença (RSVP)" },
    { key: "photoWall", label: "Mural de fotos" },
    { key: "chat", label: "Chat ao vivo" },
    { key: "playlist", label: "Sugestões de playlist" },
    { key: "gamification", label: "Gamificação (pontos e missões)" },
    { key: "donations", label: "Lista de presentes / doações" },
  ];

  return (
    <div className="bg-background rounded-lg border border-border p-6 mb-6">
      <h2 className="text-base font-semibold mb-5">Funcionalidades</h2>
      <form action={updateEventFeatures} className="flex flex-col gap-4">
        <input type="hidden" name="eventId" value={event.id} />
        <div className="flex flex-col gap-3">
          {featureList.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name={`feature_${key}`}
                defaultChecked={features[key] ?? false}
                className="size-4"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
        <Button type="submit" className="h-11">Salvar funcionalidades</Button>
      </form>
    </div>
  );
}

// ── Publicação ────────────────────────────────────────────────────────────

function PublishForm({ event }: { event: { id: string; status: string; guestApprovalRequired: boolean; donationMode: string; pixKey: string | null } }) {
  return (
    <div className="bg-background rounded-lg border border-border p-6 mb-6">
      <h2 className="text-base font-semibold mb-2">Publicar evento</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Após publicar, o link do convite ficará ativo. Você pode editar as configurações depois.
      </p>
      <form action={publishEvent} className="flex flex-col gap-4">
        <input type="hidden" name="eventId" value={event.id} />
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="guestApprovalRequired"
            defaultChecked={event.guestApprovalRequired}
            className="mt-0.5 size-4"
          />
          <span className="text-sm">
            Requerer aprovação manual de convidados antes de mostrar o convite completo
          </span>
        </label>
        <div className="flex flex-col gap-1.5">
          <Label>Modo de doação</Label>
          <div className="flex flex-col gap-2">
            {(["TRUST", "PIX_PROOF"] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="donationMode"
                  value={mode}
                  defaultChecked={event.donationMode === mode}
                  className="size-4"
                />
                <span className="text-sm">
                  {mode === "TRUST" ? "Confiança (sem confirmação)" : "Comprovante PIX"}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pixKey">Chave PIX (opcional)</Label>
          <Input id="pixKey" name="pixKey" defaultValue={event.pixKey ?? ""} placeholder="CPF, email ou chave aleatória" className="h-11" />
        </div>
        <Button type="submit" className="h-11">
          {event.status === "PUBLISHED" ? "Salvar configurações" : "Publicar evento 🎉"}
        </Button>
      </form>
    </div>
  );
}
