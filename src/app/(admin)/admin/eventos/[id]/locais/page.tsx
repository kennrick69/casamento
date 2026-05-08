import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LOCATION_TYPE_LABELS, LOCATION_TYPE_ICONS } from "@/lib/locations";
import { createLocation, updateLocation, deleteLocation, reorderLocations } from "./actions";
import type { EventLocation, LocationType } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Locais" };

const LOCATION_TYPES: LocationType[] = [
  "CEREMONY",
  "RECEPTION",
  "TEA_PARTY",
  "BACHELOR_PARTY",
  "BRUNCH",
  "REHEARSAL",
  "OTHER",
];

export default async function LocaisAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const { edit: editId } = await searchParams;

  try {
    await requireOrganizer(id);
  } catch {
    notFound();
  }

  const event = await prisma.event.findUnique({
    where: { id },
    select: { coupleNames: true, slug: true },
  });
  if (!event) notFound();

  const locations = await prisma.eventLocation.findMany({
    where: { eventId: id },
    orderBy: { order: "asc" },
  });

  const editingLocation = editId
    ? locations.find((l) => l.id === editId) ?? null
    : null;

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title={event.coupleNames} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <EventNav eventId={id} />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Locais do evento</h2>
          <a
            href={`/${event.slug}/locais`}
            target="_blank"
            className="text-sm text-primary hover:underline"
          >
            Ver página ↗
          </a>
        </div>

        {/* Edit form */}
        {editingLocation && (
          <div className="bg-background border border-primary/40 rounded-lg p-5 mb-6">
            <h3 className="font-medium mb-4">Editar local</h3>
            <LocationForm
              eventId={id}
              action={updateLocation}
              defaultValues={editingLocation}
            />
          </div>
        )}

        {/* Location list */}
        {locations.length > 0 && (
          <div className="flex flex-col gap-2 mb-8">
            {locations.map((loc, i) => (
              <div
                key={loc.id}
                className={`bg-background border rounded-lg px-4 py-3 flex items-start gap-3 ${
                  loc.id === editId ? "border-primary/40" : "border-border"
                }`}
              >
                {/* Reorder */}
                <div className="flex flex-col gap-0.5 mt-1">
                  <form action={reorderLocations}>
                    <input type="hidden" name="locationId" value={loc.id} />
                    <input type="hidden" name="eventId" value={id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={i === 0}
                      className="flex items-center justify-center w-8 h-8 text-muted-foreground disabled:opacity-20 hover:text-foreground hover:bg-muted rounded transition-colors"
                    >
                      ▲
                    </button>
                  </form>
                  <form action={reorderLocations}>
                    <input type="hidden" name="locationId" value={loc.id} />
                    <input type="hidden" name="eventId" value={id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={i === locations.length - 1}
                      className="flex items-center justify-center w-8 h-8 text-muted-foreground disabled:opacity-20 hover:text-foreground hover:bg-muted rounded transition-colors"
                    >
                      ▼
                    </button>
                  </form>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {LOCATION_TYPE_ICONS[loc.type]} {LOCATION_TYPE_LABELS[loc.type]}
                    {loc.isMain && (
                      <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        principal
                      </span>
                    )}
                    {!loc.isPublic && (
                      <span className="ml-1 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        privado
                      </span>
                    )}
                  </p>
                  <p className="font-semibold">{loc.title}</p>
                  {loc.address && (
                    <p className="text-sm text-muted-foreground">{loc.address}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  <a
                    href={`/admin/eventos/${id}/locais?edit=${loc.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Editar
                  </a>
                  <form action={deleteLocation}>
                    <input type="hidden" name="locationId" value={loc.id} />
                    <input type="hidden" name="eventId" value={id} />
                    <button
                      type="submit"
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      Remover
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        {!editingLocation && (
          <div className="bg-background border border-border rounded-lg p-5">
            <h3 className="font-medium mb-4">Adicionar local</h3>
            <LocationForm eventId={id} action={createLocation} />
          </div>
        )}
      </main>
    </div>
  );
}

// ── Formulário compartilhado (criar / editar) ─────────────────────────────

function LocationForm({
  eventId,
  action,
  defaultValues,
}: {
  eventId: string;
  action: (formData: FormData) => Promise<void>;
  defaultValues?: EventLocation;
}) {
  const dateStr = defaultValues?.date
    ? defaultValues.date.toISOString().split("T")[0]
    : "";

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="eventId" value={eventId} />
      {defaultValues && (
        <input type="hidden" name="locationId" value={defaultValues.id} />
      )}

      {/* Tipo */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type">Tipo</Label>
        <select
          id="type"
          name="type"
          defaultValue={defaultValues?.type ?? "CEREMONY"}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
        >
          {LOCATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {LOCATION_TYPE_ICONS[t]} {LOCATION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* Título */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Nome do local</Label>
        <Input
          id="title"
          name="title"
          defaultValue={defaultValues?.title ?? ""}
          placeholder="Igreja São João"
          required
          className="h-11"
        />
      </div>

      {/* Endereço */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          name="address"
          defaultValue={defaultValues?.address ?? ""}
          placeholder="Rua das Flores, 100 — São Paulo, SP"
          className="h-11"
        />
      </div>

      {/* Data + horário */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Data (opcional)</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={dateStr ?? ""}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="timeLabel">Horário (opcional)</Label>
          <Input
            id="timeLabel"
            name="timeLabel"
            defaultValue={defaultValues?.timeLabel ?? ""}
            placeholder="18:00"
            className="h-11"
          />
        </div>
      </div>

      {/* Traje */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dresscode">Traje (opcional)</Label>
        <Input
          id="dresscode"
          name="dresscode"
          defaultValue={defaultValues?.dresscode ?? ""}
          placeholder="Passeio completo"
          className="h-11"
        />
      </div>

      {/* Descrição */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Observações (opcional)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          placeholder="Informações adicionais para os convidados..."
          rows={3}
        />
      </div>

      {/* Flags */}
      <div className="flex flex-col gap-2 pt-1">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="isMain"
            defaultChecked={defaultValues?.isMain ?? false}
            className="size-4"
          />
          <span className="text-sm">Local principal deste tipo</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="isPublic"
            defaultChecked={defaultValues?.isPublic ?? true}
            className="size-4"
          />
          <span className="text-sm">Visível para todos os convidados</span>
        </label>
      </div>

      <Button type="submit" className="h-11">
        {defaultValues ? "Salvar alterações" : "Adicionar local"}
      </Button>
      {defaultValues && (
        <a
          href={`/admin/eventos/${eventId}/locais`}
          className="text-sm text-center text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </a>
      )}
    </form>
  );
}
