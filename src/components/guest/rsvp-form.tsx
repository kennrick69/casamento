"use client";

import { useEffect, useRef, useState, useTransition, startTransition } from "react";
import { useRouter } from "next/navigation";
import { submitRsvp } from "@/app/(public)/[slug]/rsvp/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail } from "lucide-react";
import { LegalModal, TermsContent, PrivacyContent } from "@/components/legal/legal-modal";

const DRAFT_VERSION = 2;
const MAX_COMPANIONS = 10;

type CompanionType = "ADULT" | "CHILD";
interface Companion {
  name: string;
  type: CompanionType;
}

interface RsvpDraft {
  v: number;
  status: "CONFIRMED" | "DECLINED";
  fields: Record<string, string>;
  checkboxes: Record<string, boolean>;
  companions: Companion[];
  savedAt: string;
}

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
    companions?: Companion[];
  };
  rsvpEarlyDeadline: Date | null;
}

export function RsvpForm({ slug, k, initialData, rsvpEarlyDeadline }: RsvpFormProps) {
  const router = useRouter();
  const [isPending, startSubmit] = useTransition();
  const [status, setStatus] = useState<"CONFIRMED" | "DECLINED">(
    initialData?.rsvpStatus ?? "CONFIRMED"
  );
  const [error, setError] = useState<string | null>(null);
  const [recoverySent, setRecoverySent] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [companions, setCompanions] = useState<Companion[]>(
    initialData?.companions ?? []
  );
  const formRef = useRef<HTMLFormElement>(null);
  const draftKey = `rsvp-draft-${slug}`;

  const isEarly = rsvpEarlyDeadline ? new Date() <= new Date(rsvpEarlyDeadline) : false;

  // Restaura rascunho do localStorage no mount. Convidado pode sair e voltar
  // sem perder o que digitou.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    let parsed: RsvpDraft | null = null;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) {
        const data = JSON.parse(raw) as RsvpDraft;
        if (data.v === DRAFT_VERSION) parsed = data;
      }
    } catch {
      // ignora rascunhos corrompidos
    }
    if (!parsed) return;

    Object.entries(parsed.fields).forEach(([name, value]) => {
      const el = form.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null;
      if (el && "value" in el && el.type !== "checkbox") {
        el.value = value;
      }
    });
    Object.entries(parsed.checkboxes).forEach(([name, checked]) => {
      const el = form.elements.namedItem(name);
      if (el instanceof HTMLInputElement && el.type === "checkbox") {
        el.checked = checked;
      }
    });
    if (parsed.status === "CONFIRMED" || parsed.status === "DECLINED") {
      startTransition(() => setStatus(parsed.status));
    }
    if (Array.isArray(parsed.companions)) {
      const sanitized = parsed.companions
        .slice(0, MAX_COMPANIONS)
        .map((c) => ({
          name: typeof c?.name === "string" ? c.name.slice(0, 80) : "",
          type: c?.type === "CHILD" ? ("CHILD" as const) : ("ADULT" as const),
        }));
      startTransition(() => setCompanions(sanitized));
    }
    startTransition(() => setDraftRestored(true));
  }, [draftKey]);

  function persistDraft() {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const fields: Record<string, string> = {};
    const checkboxes: Record<string, boolean> = {};
    for (const el of Array.from(form.elements) as HTMLElement[]) {
      const input = el as HTMLInputElement;
      if (!input.name) continue;
      if (input.type === "checkbox") {
        checkboxes[input.name] = input.checked;
      } else if (input.type !== "submit" && input.type !== "button" && input.type !== "hidden") {
        fields[input.name] = String(fd.get(input.name) ?? "");
      }
    }
    try {
      const draft: RsvpDraft = {
        v: DRAFT_VERSION,
        status,
        fields,
        checkboxes,
        companions,
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // localStorage indisponível (Safari modo privado, quota): tudo bem,
      // perda de rascunho é graceful — usuário só perde o draft, não o submit.
    }
  }

  function clearDraft() {
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Validação client-side dos acompanhantes — todo companion precisa ter nome.
    const sanitizedCompanions = companions
      .map((c) => ({ name: c.name.trim(), type: c.type }))
      .filter((c) => c.name.length > 0);
    if (sanitizedCompanions.length !== companions.length && companions.some((c) => c.name.trim().length === 0)) {
      setError("Preencha o nome de cada acompanhante ou remova os vazios.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("slug", slug);
    formData.set("rsvpStatus", status);
    formData.set("companionsJson", JSON.stringify(sanitizedCompanions));

    startSubmit(async () => {
      const result = await submitRsvp(formData);
      if (result.ok) {
        clearDraft();
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
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onInput={persistDraft}
      onChange={persistDraft}
      className="flex flex-col gap-5"
    >
      {draftRestored && (
        <div className="rounded-[var(--theme-radius)] border border-[var(--theme-accent)]/40 bg-[var(--theme-muted)] px-3 py-2 text-xs text-[var(--theme-secondary)] flex items-center justify-between gap-2">
          <span>📝 Rascunho do que você já tinha digitado.</span>
          <button
            type="button"
            onClick={() => {
              clearDraft();
              formRef.current?.reset();
              setDraftRestored(false);
            }}
            className="underline underline-offset-2 hover:text-[var(--theme-foreground)]"
          >
            Começar do zero
          </button>
        </div>
      )}

      {/* Vai / Não vai */}
      <div className="flex gap-3">
        <ToggleButton
          active={status === "CONFIRMED"}
          onClick={() => {
            setStatus("CONFIRMED");
            queueMicrotask(persistDraft);
          }}
          label="✓  Vou ao casamento!"
        />
        <ToggleButton
          active={status === "DECLINED"}
          onClick={() => {
            setStatus("DECLINED");
            queueMicrotask(persistDraft);
          }}
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
          <Field label={`Acompanhantes (${companions.length}/${MAX_COMPANIONS})`}>
            <div className="flex flex-col gap-2">
              {companions.map((companion, i) => (
                <div key={i} className="flex gap-2 items-stretch">
                  <Input
                    value={companion.name}
                    onChange={(e) => {
                      const next = [...companions];
                      next[i] = { ...next[i], name: e.target.value };
                      setCompanions(next);
                      queueMicrotask(persistDraft);
                    }}
                    placeholder="Nome do acompanhante"
                    maxLength={80}
                    className="flex-1 h-12 text-base"
                  />
                  <select
                    value={companion.type}
                    onChange={(e) => {
                      const next = [...companions];
                      next[i] = { ...next[i], type: e.target.value as CompanionType };
                      setCompanions(next);
                      queueMicrotask(persistDraft);
                    }}
                    className="h-12 rounded-[var(--theme-radius)] border border-input bg-background px-3 text-base shrink-0"
                  >
                    <option value="ADULT">Adulto</option>
                    <option value="CHILD">Criança</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setCompanions(companions.filter((_, idx) => idx !== i));
                      queueMicrotask(persistDraft);
                    }}
                    aria-label={`Remover acompanhante ${i + 1}`}
                    className="h-12 w-12 shrink-0 rounded-[var(--theme-radius)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:bg-[var(--theme-muted)] transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
              {companions.length < MAX_COMPANIONS && (
                <button
                  type="button"
                  onClick={() => {
                    setCompanions([...companions, { name: "", type: "ADULT" }]);
                    queueMicrotask(persistDraft);
                  }}
                  className="h-11 rounded-[var(--theme-radius)] border border-dashed border-[var(--theme-border)] text-sm text-[var(--theme-secondary)] hover:bg-[var(--theme-muted)] transition-colors"
                >
                  + Adicionar acompanhante
                </button>
              )}
              {companions.length === 0 && (
                <p className="text-xs text-[var(--theme-secondary)]">
                  Vou só eu — nenhum acompanhante.
                </p>
              )}
            </div>
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
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                termos de uso
              </button>{" "}
              e a{" "}
              <button
                type="button"
                onClick={() => setPrivacyOpen(true)}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                política de privacidade
              </button>{" "}
              *
            </>
          }
        />
        {status === "CONFIRMED" && (
          <>
            <ConsentField
              name="consentPhotoMural"
              label="Autorizo o uso das minhas fotos no mural do evento"
            />
            <ConsentField
              name="profilePublic"
              label="Quero aparecer na página 'Quem vai estar lá' (perfil público opcional)"
            />
          </>
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

      <LegalModal open={termsOpen} onClose={() => setTermsOpen(false)} title="Termos de Uso">
        <TermsContent />
      </LegalModal>
      <LegalModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Política de Privacidade"
      >
        <PrivacyContent />
      </LegalModal>
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
