"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateProfile } from "./actions";

interface Props {
  firstName: string;
  lastName: string;
  phone: string | null;
}

export function ProfileForm({ firstName, lastName, phone }: Props) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    startTransition(async () => {
      const result = await updateProfile(fd);
      if (result.ok) {
        toast.success("Dados salvos!");
      } else {
        toast.error(result.error ?? "Erro ao salvar.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">Nome</Label>
          <Input id="firstName" name="firstName" defaultValue={firstName} required className="h-11" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Sobrenome</Label>
          <Input id="lastName" name="lastName" defaultValue={lastName} required className="h-11" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">
          Telefone <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone ?? ""}
          placeholder="+55 11 99999-9999"
          className="h-11"
        />
      </div>
      <Button type="submit" disabled={isPending} className="h-11 self-start px-6">
        {isPending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
