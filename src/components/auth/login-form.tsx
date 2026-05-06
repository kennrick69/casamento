"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await signIn("resend", { email, redirect: false, callbackUrl: "/admin" });
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center space-y-3">
        <p className="text-lg">📬</p>
        <p className="font-medium">Link enviado!</p>
        <p className="text-sm text-muted-foreground">
          Verifique sua caixa de entrada em <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="h-12 text-base"
        />
      </div>
      <Button type="submit" className="w-full h-12" disabled={loading}>
        {loading ? "Enviando..." : "Enviar link de acesso"}
      </Button>
    </form>
  );
}
