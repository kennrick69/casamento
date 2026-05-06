import type { Metadata } from "next";

export const metadata: Metadata = { title: "Verifique seu e-mail" };

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="text-4xl">📬</div>
        <h1 className="text-2xl font-semibold">Verifique seu e-mail</h1>
        <p className="text-muted-foreground">
          Enviamos um link de acesso para o seu e-mail. Clique no link para
          entrar.
        </p>
        <p className="text-sm text-muted-foreground">
          O link expira em 10 minutos. Não encontrou? Verifique o spam.
        </p>
      </div>
    </div>
  );
}
