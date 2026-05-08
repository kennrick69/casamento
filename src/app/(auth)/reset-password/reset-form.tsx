"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordStrengthBar } from "@/components/auth/password-strength-bar";
import { resetPasswordAction } from "./actions";

const schema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export function ResetForm({ token }: { token: string }) {
  const form = useForm<FormData>({ resolver: zodResolver(schema) });
  const [isPending, startTransition] = useTransition();
  // eslint-disable-next-line react-hooks/incompatible-library
  const password = form.watch("password") ?? "";

  const onSubmit = form.handleSubmit((data) => {
    const fd = new FormData();
    fd.append("token", token);
    fd.append("password", data.password);
    fd.append("confirmPassword", data.confirmPassword);
    startTransition(async () => {
      const result = await resetPasswordAction(fd);
      if (result?.error) {
        if (result.field === "password") {
          form.setError("password", { message: result.error });
        } else if (result.field === "confirmPassword") {
          form.setError("confirmPassword", { message: result.error });
        } else {
          form.setError("root", { message: result.error });
        }
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="new-password">Nova senha</Label>
        <Input
          id="new-password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          aria-invalid={!!form.formState.errors.password}
          className="h-12 text-base"
          {...form.register("password")}
        />
        <PasswordStrengthBar password={password} />
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">Confirmar nova senha</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          aria-invalid={!!form.formState.errors.confirmPassword}
          className="h-12 text-base"
          {...form.register("confirmPassword")}
        />
        {form.formState.errors.confirmPassword && (
          <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
        )}
      </div>

      {form.formState.errors.root && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      )}

      <Button type="submit" className="w-full h-12 text-base" disabled={isPending}>
        {isPending ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
