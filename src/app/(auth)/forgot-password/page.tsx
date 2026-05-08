import { ForgotForm } from "./forgot-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-serif text-3xl tracking-widest text-foreground">Voem.</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border/40 p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">Esqueci minha senha</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Informe seu e-mail e enviaremos um link para criar uma nova senha.
            </p>
          </div>
          <ForgotForm />
        </div>
      </div>
    </div>
  );
}
