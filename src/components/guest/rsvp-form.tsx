"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitRsvp } from "@/app/(public)/[slug]/rsvp/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail } from "lucide-react";

interface RsvpFormProps {
  slug: string;
  k?: string;
  initialData?: {
    name: string;
    emailAddr: string;
    phone: string;
    plusOnes: number;
    dietaryRestrictions: string;
    message: string;
    rsvpStatus: "CONFIRMED" | "DECLINED";
  };
  rsvpEarlyDeadline: Date | null;
}

export function RsvpForm({ slug, k, initialData, rsvpEarlyDeadline }: RsvpFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"CONFIRMED" | "DECLINED">(
    initialData?.rsvpStatus ?? "CONFIRMED"
  );
  const [error, setError] = useState<string | null>(null);
  const [recoverySent, setRecoverySent] = useState<string | null>(null);

  const isEarly = rsvpEarlyDeadline ? new Date() <= new Date(rsvpEarlyDeadline) : false;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("slug", slug);
    formData.set("rsvpStatus", status);

    startTransition(async () => {
      const result = await submitRsvp(formData);
      if (result.ok) {
        const kParam = k ? `&k=${encodeURIComponent(k)}` : "";
        router.push(`/${slug}/rsvp/sucesso?status=${result.status}${kParam}`);
      } else if (result.type === "RECOVERY_SENT") {
        setRecoverySent(result.emailAddr);
      } else {
        setError(result.message);
      }
    });
  }

  if (recoverySent) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Mail size={40} className="text-[var(--theme-accent)]" />
        <h2 className="text-lg font-semibold">Verifique seu e-mail</h2>
        <p className="text-sm text-[var(--theme-secondary)] max-w-xs">
          Você já está na nossa lista! Enviamos um link de acesso para{" "}
          <strong>{recoverySent}</strong>.
        </p>
        <p className="text-xs text-[var(--theme-secondary)]">
          Não chegou? Verifique o spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Vai / Não vai */}
      <div className="flex gap-3">
        <ToggleButton
          active={status === "CONFIRMED"}
          onClick={() => setStatus("CONFIRMED")}
          label="✓  Vou ao casamento!"
        />
        <ToggleButton
          active={status === "DECLINED"}
          onClick={() => setStatus("DECLINED")}
          label="✗  Não poderei ir"
        />
      </div>

      {isEarly && status === "CONFIRMED" && (
        <p className="text-xs text-[var(--theme-accent)] font-medium bg-[var(--theme-muted)] rounded-[var(--theme-radius)] px-3 py-2">
          ⭐ Confirmação antecipada — você ganhará pontos bônus na gincana!
        </p>
      )}

      {/* Campos */}
      <Field label="Seu nome completo *">
        <Input
          name="name"
          defaultValue={initialData?.name}
          required
          minLength={2}
          className="h-12 text-base"
          placeholder="Maria da Silva"
          autoComplete="name"
        />
      </Field>

      <Field label="Seu e-mail *">
        <Input
          name="emailAddr"
          type="email"
          defaultValue={initialData?.emailAddr}
          required
          className="h-12 text-base"
          placeholder="maria@email.com"
          autoComplete="email"
        />
      </Field>

      <Field label="Telefone (WhatsApp)">
        <Input
          name="phone"
          type="tel"
          defaultValue={initialData?.phone}
          className="h-12 text-base"
          placeholder="(11) 99999-9999"
          autoComplete="tel"
        />
      </Field>

      {status === "CONFIRMED" && (
        <>
          <Field label="Vai acompanhado(a)?">
            <select
              name="plusOnes"
              defaultValue={initialData?.plusOnes ?? 0}
              className="h-12 w-full rounded-[var(--theme-radius)] border border-input bg-background px-3 text-base"
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Só eu" : `Eu + ${n} pessoa${n > 1 ? "s" : ""}`}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Restrições alimentares">
            <Input
              name="dietaryRestrictions"
              defaultValue={initialData?.dietaryRestrictions}
              className="h-12 text-base"
              placeholder="Vegetariano, alergia a glúten…"
            />
          </Field>

          <Field label="Recado para os noivos">
            <Textarea
              name="message"
              defaultValue={initialData?.message}
              rows={3}
              className="text-base resize-none"
              placeholder="Uma mensagem especial para o casal…"
            />
          </Field>
        </>
      )}

      {/* Consentimentos LGPD */}
      <div className="flex flex-col gap-3 pt-1">
        <ConsentField
          name="consentTerms"
          required
          label={
            <>
              Li e aceito os{" "}
              <a href="/termos" target="_blank" className="underline underline-offset-2">
                termos de uso
              </a>{" "}
              e a{" "}
              <a href="/privacidade" target="_blank" className="underline underline-offset-2">
                política de privacidade
              </a>{" "}
              *
            </>
          }
        />
        {status === "CONFIRMED" && (
          <ConsentField
            name="consentPhotoMural"
            label="Autorizo o uso das minhas fotos no mural do evento"
          />
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-[var(--theme-radius)] px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-14 text-base font-semibold w-full mt-1"
      >
        {isPending
          ? "Enviando…"
          : status === "CONFIRMED"
            ? "Confirmar presença"
            : "Enviar resposta"}
      </Button>

      <input type="hidden" name="k" value={k ?? ""} />
    </form>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 h-12 rounded-[var(--theme-radius)] border text-sm font-medium transition-colors",
        active
          ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-white"
          : "border-[var(--theme-border)] bg-transparent text-[var(--theme-secondary)] hover:border-[var(--theme-primary)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function ConsentField({
  name,
  label,
  required,
}: {
  name: string;
  label: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        name={name}
        id={name}
        required={required}
        className="mt-0.5 shrink-0 size-5"
      />
      <label htmlFor={name} className="text-sm text-[var(--theme-secondary)] leading-snug">
        {label}
      </label>
    </div>
  );
}
