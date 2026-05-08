"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { updateEventLocation, saveEventLocationDraft } from "./actions";
import { isRedirectError } from "@/lib/utils/redirect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const schema = z.object({
  ceremonyLocation: z.string().optional(),
  ceremonyAddress: z.string().optional(),
  receptionLocation: z.string().optional(),
  receptionAddress: z.string().optional(),
  mapsLink: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      "Cole o link completo do Maps, começando com https://"
    ),
  dresscode: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type DraftStatus = "idle" | "saving" | "saved";

interface Props {
  eventId: string;
  defaultValues: {
    ceremonyLocation?: string;
    ceremonyAddress?: string;
    receptionLocation?: string;
    receptionAddress?: string;
    mapsLink?: string;
    dresscode?: string;
  };
}

export function WizardLocationForm({ eventId, defaultValues }: Props) {
  const [isPending, startTransition] = useTransition();
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("idle");
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  function buildFd(data: FormValues): FormData {
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("ceremonyLocation", data.ceremonyLocation ?? "");
    fd.set("ceremonyAddress", data.ceremonyAddress ?? "");
    fd.set("receptionLocation", data.receptionLocation ?? "");
    fd.set("receptionAddress", data.receptionAddress ?? "");
    fd.set("mapsLink", data.mapsLink ?? "");
    fd.set("dresscode", data.dresscode ?? "");
    return fd;
  }

  async function autoSave() {
    const data = getValues();
    const result = schema.safeParse(data);
    if (!result.success) return;
    setDraftStatus("saving");
    try {
      await saveEventLocationDraft(buildFd(result.data));
      setDraftStatus("saved");
      setTimeout(() => setDraftStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setDraftStatus("idle");
    }
  }

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      try {
        await updateEventLocation(buildFd(data));
      } catch (e) {
        if (isRedirectError(e)) throw e;
        toast.error("Algo deu errado. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ceremonyLocation">Local da cerimônia</Label>
        <Input
          id="ceremonyLocation"
          placeholder="Igreja São João"
          className="h-11"
          {...register("ceremonyLocation", { onBlur: autoSave })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ceremonyAddress">Endereço da cerimônia</Label>
        <Input
          id="ceremonyAddress"
          placeholder="Rua das Flores, 100 — São Paulo, SP"
          className="h-11"
          {...register("ceremonyAddress", { onBlur: autoSave })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="receptionLocation">Local da recepção</Label>
        <Input
          id="receptionLocation"
          placeholder="Espaço Villa Eventos"
          className="h-11"
          {...register("receptionLocation", { onBlur: autoSave })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="receptionAddress">Endereço da recepção</Label>
        <Input
          id="receptionAddress"
          className="h-11"
          {...register("receptionAddress", { onBlur: autoSave })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mapsLink">Link do Google Maps (opcional)</Label>
        <Input
          id="mapsLink"
          type="url"
          placeholder="https://maps.google.com/..."
          className="h-11"
          {...register("mapsLink", { onBlur: autoSave })}
        />
        {errors.mapsLink && (
          <p className="text-xs text-destructive">{errors.mapsLink.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dresscode">Traje</Label>
        <Input
          id="dresscode"
          placeholder="Passeio completo"
          className="h-11"
          {...register("dresscode", { onBlur: autoSave })}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        {draftStatus !== "idle" ? (
          <span className="text-xs text-muted-foreground">
            {draftStatus === "saving" ? "Salvando…" : "✓ Salvo"}
          </span>
        ) : (
          <span />
        )}
        <Button type="submit" className="h-11" disabled={isPending}>
          {isPending ? "Salvando…" : "Próximo: Tema →"}
        </Button>
      </div>
    </form>
  );
}
