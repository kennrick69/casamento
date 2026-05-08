"use client";

import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordStrengthBar } from "@/components/auth/password-strength-bar";
import { updatePassword } from "./actions";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Obrigatório"),
    newPassword: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export function ChangePasswordForm() {
  const form = useForm<FormData>({ resolver: zodResolver(schema) });
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  // eslint-disable-next-line react-hooks/incompatible-library
  const newPassword = form.watch("newPassword") ?? "";

  const onSubmit = form.handleSubmit((data) => {
    const fd = new FormData();
    fd.append("currentPassword", data.currentPassword);
    fd.append("newPassword", data.newPassword);
    fd.append("confirmPassword", data.confirmPassword);
    startTransition(async () => {
      const result = await updatePassword(fd);
      if (result === null) return; // redirect happening
      if (result?.ok) {
        setSuccess(true);
        form.reset();
      } else if (result?.error) {
        form.setError("root", { message: result.error });
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {success && (
        <p className="text-sm text-green-600 bg-green-50 rounded-lg px-4 py-2">
          Senha alterada com sucesso.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentPassword">Senha atual</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          className="h-11"
          {...form.register("currentPassword")}
        />
        {form.formState.errors.currentPassword && (
          <p className="text-xs text-destructive">{form.formState.errors.currentPassword.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">Nova senha</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          className="h-11"
          {...form.register("newPassword")}
        />
        <PasswordStrengthBar password={newPassword} />
        {form.formState.errors.newPassword && (
          <p className="text-xs text-destructive">{form.formState.errors.newPassword.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="h-11"
          {...form.register("confirmPassword")}
        />
        {form.formState.errors.confirmPassword && (
          <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
        )}
      </div>

      {form.formState.errors.root && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2">
          {form.formState.errors.root.message}
        </p>
      )}

      <Button type="submit" className="h-11 self-start px-6" disabled={isPending}>
        {isPending ? "Salvando…" : "Alterar senha"}
      </Button>
    </form>
  );
}
