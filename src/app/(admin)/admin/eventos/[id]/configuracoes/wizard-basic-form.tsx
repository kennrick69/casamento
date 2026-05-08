"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { updateEventBasic } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const schema = z
  .object({
    coupleNames: z.string().min(3, "Informe o nome do casal (mínimo 3 caracteres)"),
    ceremonyDate: z.string().min(1, "Escolha a data do casamento"),
    ceremonyTime: z.string().min(1, "Informe o horário da cerimônia"),
    rsvpEarlyDeadline: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.rsvpEarlyDeadline && d.ceremonyDate) {
        return d.rsvpEarlyDeadline < d.ceremonyDate;
      }
      return true;
    },
    {
      message: "O prazo de confirmação deve ser antes da data do casamento",
      path: ["rsvpEarlyDeadline"],
    }
  );

type FormValues = z.infer<typeof schema>;
type DraftStatus = "idle" | "saving" | "saved";

interface Props {
  eventId: string;
  timezone: string;
  defaultValues: {
    coupleNames: string;
    ceremonyDate: string;
    ceremonyTime: string;
    rsvpEarlyDeadline?: string;
  };
}

export function WizardBasicForm({ eventId, timezone, defaultValues }: Props) {
  const router = useRouter();
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
    fd.set("coupleNames", data.coupleNames);
    fd.set("ceremonyDate", data.ceremonyDate);
    fd.set("ceremonyTime", data.ceremonyTime);
    fd.set("timezone", timezone);
    if (data.rsvpEarlyDeadline) fd.set("rsvpEarlyDeadline", data.rsvpEarlyDeadline);
    return fd;
  }

  async function autoSave() {
    const data = getValues();
    const result = schema.safeParse(data);
    if (!result.success) return;
    setDraftStatus("saving");
    try {
      await updateEventBasic(buildFd(result.data));
      setDraftStatus("saved");
      setTimeout(() => setDraftStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setDraftStatus("idle");
    }
  }

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      try {
        await updateEventBasic(buildFd(data));
        router.push("?step=2");
      } catch {
        toast.error("Algo deu errado. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="coupleNames">Nome do casal</Label>
        <Input
          id="coupleNames"
          className="h-11"
          {...register("coupleNames", { onBlur: autoSave })}
        />
        {errors.coupleNames && (
          <p className="text-xs text-destructive">{errors.coupleNames.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ceremonyDate">Data da cerimônia</Label>
          <Input
            id="ceremonyDate"
            type="date"
            className="h-11"
            {...register("ceremonyDate", { onBlur: autoSave })}
          />
          {errors.ceremonyDate && (
            <p className="text-xs text-destructive">{errors.ceremonyDate.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ceremonyTime">Horário</Label>
          <Input
            id="ceremonyTime"
            type="time"
            className="h-11"
            {...register("ceremonyTime", { onBlur: autoSave })}
          />
          {errors.ceremonyTime && (
            <p className="text-xs text-destructive">{errors.ceremonyTime.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rsvpEarlyDeadline">
          Prazo limite para confirmação de presença
          <span className="ml-1 text-muted-foreground font-normal text-xs">(opcional)</span>
        </Label>
        <Input
          id="rsvpEarlyDeadline"
          type="date"
          className="h-11"
          {...register("rsvpEarlyDeadline", { onBlur: autoSave })}
        />
        {errors.rsvpEarlyDeadline && (
          <p className="text-xs text-destructive">{errors.rsvpEarlyDeadline.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Convidados que confirmarem antes desta data ganham pontos extras.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 mt-2">
        {draftStatus !== "idle" ? (
          <span className="text-xs text-muted-foreground">
            {draftStatus === "saving" ? "Salvando…" : "✓ Salvo"}
          </span>
        ) : (
          <span />
        )}
        <Button type="submit" className="h-11" disabled={isPending}>
          {isPending ? "Salvando…" : "Próximo: Local →"}
        </Button>
      </div>
    </form>
  );
}
