"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { updateEventLocation } from "./actions";
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("ceremonyLocation", data.ceremonyLocation ?? "");
      fd.set("ceremonyAddress", data.ceremonyAddress ?? "");
      fd.set("receptionLocation", data.receptionLocation ?? "");
      fd.set("receptionAddress", data.receptionAddress ?? "");
      fd.set("mapsLink", data.mapsLink ?? "");
      fd.set("dresscode", data.dresscode ?? "");
      try {
        await updateEventLocation(fd);
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
          {...register("ceremonyLocation")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ceremonyAddress">Endereço da cerimônia</Label>
        <Input
          id="ceremonyAddress"
          placeholder="Rua das Flores, 100 — São Paulo, SP"
          className="h-11"
          {...register("ceremonyAddress")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="receptionLocation">Local da recepção</Label>
        <Input
          id="receptionLocation"
          placeholder="Espaço Villa Eventos"
          className="h-11"
          {...register("receptionLocation")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="receptionAddress">Endereço da recepção</Label>
        <Input
          id="receptionAddress"
          className="h-11"
          {...register("receptionAddress")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mapsLink">Link do Google Maps (opcional)</Label>
        <Input
          id="mapsLink"
          type="url"
          placeholder="https://maps.google.com/..."
          className="h-11"
          {...register("mapsLink")}
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
          {...register("dresscode")}
        />
      </div>

      <Button type="submit" className="h-11" disabled={isPending}>
        {isPending ? "Salvando…" : "Próximo: Tema →"}
      </Button>
    </form>
  );
}
