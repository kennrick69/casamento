"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { requestPasswordReset } from "./actions";

const CF_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const schema = z.object({ email: z.string().email("E-mail inválido") });
type FormData = z.infer<typeof schema>;

export function ForgotForm() {
  const form = useForm<FormData>({ resolver: zodResolver(schema) });
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const onSubmit = form.handleSubmit((data) => {
    if (CF_SITE_KEY && !turnstileToken) {
      form.setError("root", { message: "Complete a verificação de segurança." });
      return;
    }
    const fd = new FormData();
    fd.append("email", data.email);
    fd.append("website", ""); // honeypot
    fd.append("cf-turnstile-response", turnstileToken ?? "");
    startTransition(async () => {
      const result = await requestPasswordReset(fd);
      if (result === null) {
        setSubmitted(true);
      } else if (result?.error) {
        if (result.field === "email") {
          form.setError("email", { message: result.error });
        } else {
          form.setError("root", { message: result.error });
        }
      }
    });
  });

  if (submitted) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">📬</div>
        <p className="text-sm text-muted-foreground">
          Se esse e-mail estiver cadastrado, você receberá um link de redefinição em breve.
          Verifique também a pasta de spam.
        </p>
        <Link href="/login" className="text-sm text-primary underline underline-offset-4">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {/* Honeypot */}
      <div aria-hidden="true" className="absolute -top-[9999px] left-0">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="forgot-email">E-mail</Label>
        <Input
          id="forgot-email"
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
          aria-invalid={!!form.formState.errors.email}
          className="h-12 text-base"
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      {form.formState.errors.root && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      )}

      <TurnstileWidget onToken={setTurnstileToken} />

      <Button type="submit" className="w-full h-12 text-base" disabled={isPending}>
        {isPending ? "Enviando…" : "Receber link de redefinição"}
      </Button>

      <div className="text-center">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Voltar para o login
        </Link>
      </div>
    </form>
  );
}
