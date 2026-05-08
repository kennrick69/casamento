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
  updateEventBasic,
  updateEventFeatures,
} from "./actions";
import { WizardBasicForm } from "./wizard-basic-form";
import { WizardLocationForm } from "./wizard-location-form";
import { WizardPublishForm } from "./wizard-publish-form";
import { THEMES } from "@/lib/themes";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Configurações" };

const STEPS = ["Dados básicos", "Local", "Tema visual", "Publicar"];

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

  // P4-C: wizard só faz sentido para rascunhos
  if (step === 4 && event.status !== "DRAFT") {
    redirect(`/admin/eventos/${id}/configuracoes`);
  }

  const themes = await prisma.theme.findMany({ orderBy: { name: "asc" } });

  const dateStr = event.ceremonyDate.toISOString().split("T")[0];
  const timeStr = event.ceremonyDate.toISOString().split("T")[1]?.slice(0, 5) ?? "16:00";
  const deadlineStr = event.rsvpEarlyDeadline
    ? event.rsvpEarlyDeadline.toISOString().split("T")[0]
    : undefined;

  const features = event.features as Record<string, boolean>;

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            ← Meus eventos
          </Link>
        </div>

        {/* Progress bar (wizard only) */}
        {isWizard && (
          <>
            <div className="flex gap-2 mb-2 text-xs font-medium flex-wrap">
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
                  {i + 1} {s}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mb-6">Passo {step} de 4</p>
          </>
        )}

        {/* F1: Back button (steps 2–4) */}
        {isWizard && step > 1 && (
          <div className="mb-4">
            <Link
              href={`?step=${step - 1}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Passo {step - 1}: {STEPS[step - 2]}
            </Link>
          </div>
        )}

        {/* Event nav (non-wizard only) */}
        {!isWizard && <EventNav eventId={id} />}

        {/* ── Step 0: normal config (all forms) ── */}
        {step === 0 && (
          <>
            <BasicForm event={event} />
            <LocationForm event={event} />
            <ThemeForm event={event} themes={themes} />
            <FeaturesForm event={event} />
          </>
        )}

        {/* ── Step 1: dados básicos (voltou do passo 2) ── */}
        {step === 1 && (
          <div className="bg-background rounded-lg border border-border p-6 mb-6">
            <h2 className="text-base font-semibold mb-5">Dados básicos</h2>
            <WizardBasicForm
              eventId={id}
              timezone={event.timezone}
              defaultValues={{
                coupleNames: event.coupleNames,
                ceremonyDate: dateStr,
                ceremonyTime: timeStr,
                rsvpEarlyDeadline: deadlineStr,
              }}
            />
          </div>
        )}

        {/* ── Step 2: local ── */}
        {step === 2 && (
          <div className="bg-background rounded-lg border border-border p-6 mb-6">
            <h2 className="text-base font-semibold mb-5">Local</h2>
            <WizardLocationForm
              eventId={id}
              defaultValues={{
                ceremonyLocation: event.ceremonyLocation ?? undefined,
                ceremonyAddress: event.ceremonyAddress ?? undefined,
                receptionLocation: event.receptionLocation ?? undefined,
                receptionAddress: event.receptionAddress ?? undefined,
                mapsLink: event.mapsLink ?? undefined,
                dresscode: event.dresscode ?? undefined,
              }}
            />
          </div>
        )}

        {/* ── Step 3: tema ── */}
        {step === 3 && <ThemeForm event={event} themes={themes} isWizard />}

        {/* ── Step 4: publicar (apenas rascunhos — veja P4-C acima) ── */}
        {step === 4 && (
          <div className="bg-background rounded-lg border border-border p-6 mb-6">
            <h2 className="text-base font-semibold mb-2">Publicar evento</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Após publicar, o link do convite ficará ativo. Você pode editar as configurações
              depois.
            </p>
            <WizardPublishForm
              eventId={id}
              slug={event.slug}
              defaultValues={{
                guestApprovalRequired: event.guestApprovalRequired,
                donationMode:
                  event.donationMode === "PIX_PROOF" ? "PIX_PROOF" : "TRUST",
                pixKey: event.pixKey ?? undefined,
              }}
              hasDonations={features.donations === true}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Formulário de dados básicos (step=0, não-wizard) ─────────────────────────

function BasicForm({
  event,
}: {
  event: {
    id: string;
    slug: string;
    coupleNames: string;
    ceremonyDate: Date;
    timezone: string;
    rsvpEarlyDeadline: Date | null;
  };
}) {
  const dateStr = event.ceremonyDate.toISOString().split("T")[0];
  const timeStr = event.ceremonyDate.toISOString().split("T")[1]?.slice(0, 5) ?? "16:00";
  const deadlineStr = event.rsvpEarlyDeadline
    ? event.rsvpEarlyDeadline.toISOString().split("T")[0]
    : "";

  return (
    <div className="bg-background rounded-lg border border-border p-6 mb-6">
      <h2 className="text-base font-semibold mb-5">Dados do evento</h2>
      <form action={updateEventBasic} className="flex flex-col gap-4">
        <input type="hidden" name="eventId" value={event.id} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coupleNames">Nome do casal</Label>
          <Input
            id="coupleNames"
            name="coupleNames"
            defaultValue={event.coupleNames}
            required
            className="h-11"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ceremonyDate">Data</Label>
            <Input
              id="ceremonyDate"
              name="ceremonyDate"
              type="date"
              defaultValue={dateStr}
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
              defaultValue={timeStr}
              required
              className="h-11"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rsvpEarlyDeadline">Prazo limite para confirmação de presença</Label>
          <Input
            id="rsvpEarlyDeadline"
            name="rsvpEarlyDeadline"
            type="date"
            defaultValue={deadlineStr}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            Convidados que confirmarem antes desta data ganham pontos extras.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">
            URL do convite
            <span className="ml-1 font-normal text-xs text-muted-foreground">
              (letras, números e hífen)
            </span>
          </Label>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-sm shrink-0">casamento.app/</span>
            <Input
              id="slug"
              name="slug"
              defaultValue={event.slug}
              required
              pattern="[a-z0-9-]+"
              className="h-11"
            />
          </div>
        </div>
        <input type="hidden" name="timezone" value={event.timezone} />
        <Button type="submit" className="h-11">
          Salvar
        </Button>
      </form>
    </div>
  );
}

// ── Formulário de local (step=0, não-wizard) ──────────────────────────────────

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
          <Input
            id="ceremonyLocation"
            name="ceremonyLocation"
            defaultValue={event.ceremonyLocation ?? ""}
            placeholder="Igreja São João"
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ceremonyAddress">Endereço da cerimônia</Label>
          <Input
            id="ceremonyAddress"
            name="ceremonyAddress"
            defaultValue={event.ceremonyAddress ?? ""}
            placeholder="Rua das Flores, 100 — São Paulo, SP"
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="receptionLocation">Local da recepção</Label>
          <Input
            id="receptionLocation"
            name="receptionLocation"
            defaultValue={event.receptionLocation ?? ""}
            placeholder="Espaço Villa Eventos"
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="receptionAddress">Endereço da recepção</Label>
          <Input
            id="receptionAddress"
            name="receptionAddress"
            defaultValue={event.receptionAddress ?? ""}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mapsLink">Link do Google Maps (opcional)</Label>
          <Input
            id="mapsLink"
            name="mapsLink"
            type="url"
            defaultValue={event.mapsLink ?? ""}
            placeholder="https://maps.google.com/..."
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dresscode">Traje</Label>
          <Input
            id="dresscode"
            name="dresscode"
            defaultValue={event.dresscode ?? ""}
            placeholder="Passeio completo"
            className="h-11"
          />
        </div>
        <Button type="submit" className="h-11">
          Salvar local →
        </Button>
      </form>
    </div>
  );
}

// ── Seleção de tema ───────────────────────────────────────────────────────────

function ThemeForm({
  event,
  themes,
  isWizard = false,
}: {
  event: { id: string; theme: { key: string; name: string } };
  themes: { id: string; key: string; name: string }[];
  isWizard?: boolean;
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
            const color =
              themeData?.tokens.colors.primary ?? themeColors[theme.key] ?? "#1A1A1A";
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
                <div className="w-10 h-10 rounded-full" style={{ background: color }} />
                <span className="text-xs text-center leading-tight">{theme.name}</span>
              </label>
            );
          })}
        </div>
        <Button type="submit" className="h-11">
          {isWizard ? "Próximo: Publicar →" : "Salvar tema →"}
        </Button>
      </form>
    </div>
  );
}

// ── Funcionalidades (step=0 apenas) ──────────────────────────────────────────

function FeaturesForm({ event }: { event: { id: string; features: unknown } }) {
  const features = event.features as Record<string, boolean>;
  const featureList = [
    { key: "rsvp", label: "Confirmação de presença" },
    { key: "photoWall", label: "Mural de fotos" },
    { key: "chat", label: "Chat ao vivo" },
    { key: "playlist", label: "Sugestões de playlist" },
    { key: "gamification", label: "Gincana (pontos e missões)" },
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
        <Button type="submit" className="h-11">
          Salvar funcionalidades
        </Button>
      </form>
    </div>
  );
}
