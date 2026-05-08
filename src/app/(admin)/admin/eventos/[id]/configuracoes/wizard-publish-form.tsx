"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { publishEvent, savePublishSettings } from "./actions";
import { isRedirectError } from "@/lib/utils/redirect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const schema = z.object({
  guestApprovalRequired: z.boolean(),
  donationMode: z.enum(["TRUST", "PIX_PROOF"]),
  pixKey: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type DraftStatus = "idle" | "saving" | "saved";

interface Props {
  eventId: string;
  slug: string;
  defaultValues: FormValues;
  hasDonations: boolean;
}

export function WizardPublishForm({ eventId, slug, defaultValues, hasDonations }: Props) {
  const [isPending, startTransition] = useTransition();
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("idle");
  const { register, handleSubmit, getValues } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  function buildFd(data: FormValues): FormData {
    const fd = new FormData();
    fd.set("eventId", eventId);
    if (data.guestApprovalRequired) fd.set("guestApprovalRequired", "on");
    fd.set("donationMode", data.donationMode);
    if (data.pixKey) fd.set("pixKey", data.pixKey);
    return fd;
  }

  async function autoSave() {
    const data = getValues();
    setDraftStatus("saving");
    try {
      await savePublishSettings(buildFd(data));
      setDraftStatus("saved");
      setTimeout(() => setDraftStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setDraftStatus("idle");
    }
  }

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      try {
        await publishEvent(buildFd(data));
      } catch (e) {
        if (isRedirectError(e)) throw e;
        toast.error("Algo deu errado. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="mb-1 rounded-lg bg-muted px-4 py-3">
        <p className="text-xs text-muted-foreground mb-1">Seu convite estará em:</p>
        <p className="font-mono text-sm font-medium break-all">casamento.app/{slug}</p>
        <p className="text-xs text-muted-foreground mt-1.5">
          Para alterar a URL, acesse Configurações após publicar.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 size-4"
          {...register("guestApprovalRequired", { onChange: autoSave })}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">Revisar cada convidado antes de liberar o convite</span>
          <span className="text-xs text-muted-foreground">
            Ative se quiser aprovar individualmente cada convidado que se cadastrar.
          </span>
        </div>
      </label>

      {hasDonations && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label>Modo de doação</Label>
            <div className="flex flex-col gap-2">
              {(["TRUST", "PIX_PROOF"] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={mode}
                    className="size-4"
                    {...register("donationMode", { onChange: autoSave })}
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
            <Input
              id="pixKey"
              placeholder="CPF, email ou chave aleatória"
              className="h-11"
              {...register("pixKey", { onBlur: autoSave })}
            />
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-3">
        {draftStatus !== "idle" ? (
          <span className="text-xs text-muted-foreground">
            {draftStatus === "saving" ? "Salvando…" : "✓ Salvo"}
          </span>
        ) : (
          <span />
        )}
        <Button type="submit" className="h-11" disabled={isPending}>
          {isPending ? "Publicando…" : "Publicar evento 🎉"}
        </Button>
      </div>
    </form>
  );
}
