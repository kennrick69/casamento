"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("coupleNames", data.coupleNames);
      fd.set("ceremonyDate", data.ceremonyDate);
      fd.set("ceremonyTime", data.ceremonyTime);
      fd.set("timezone", timezone);
      if (data.rsvpEarlyDeadline) fd.set("rsvpEarlyDeadline", data.rsvpEarlyDeadline);
      try {
        await updateEventBasic(fd);
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
        <Input id="coupleNames" className="h-11" {...register("coupleNames")} />
        {errors.coupleNames && (
          <p className="text-xs text-destructive">{errors.coupleNames.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ceremonyDate">Data da cerimônia</Label>
          <Input id="ceremonyDate" type="date" className="h-11" {...register("ceremonyDate")} />
          {errors.ceremonyDate && (
            <p className="text-xs text-destructive">{errors.ceremonyDate.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ceremonyTime">Horário</Label>
          <Input id="ceremonyTime" type="time" className="h-11" {...register("ceremonyTime")} />
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
          {...register("rsvpEarlyDeadline")}
        />
        {errors.rsvpEarlyDeadline && (
          <p className="text-xs text-destructive">{errors.rsvpEarlyDeadline.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Convidados que confirmarem antes desta data ganham pontos extras.
        </p>
      </div>

      <Button type="submit" className="h-11 mt-2" disabled={isPending}>
        {isPending ? "Salvando…" : "Próximo: Local →"}
      </Button>
    </form>
  );
}
