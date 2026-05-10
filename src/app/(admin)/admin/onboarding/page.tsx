import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { completeOnboarding } from "./actions";

export const metadata: Metadata = { title: "Bem-vindo ao Voem." };

interface Props {
  searchParams: Promise<{ step?: string }>;
}

const STEPS = [
  {
    icon: "💍",
    title: "Bem-vindo ao Voem.",
    subtitle: "Sua plataforma de convites de casamento",
    body: "Crie convites digitais personalizados, gerencie confirmações de presença e engaje seus convidados com fotos, playlist e muito mais — tudo em um só lugar.",
    next: "/admin/onboarding?step=2",
    nextLabel: "Continuar",
  },
  {
    icon: "✨",
    title: "O que você pode fazer",
    subtitle: null,
    body: null,
    features: [
      { icon: "📋", label: "Confirmação de presença online" },
      { icon: "📸", label: "Mural de fotos colaborativo" },
      { icon: "🎵", label: "Sugestões de playlist dos convidados" },
      { icon: "🎯", label: "Gamificação com pontos e missões" },
      { icon: "💝", label: "Lista de presentes e doações via PIX" },
      { icon: "📊", label: "Painel com estatísticas em tempo real" },
    ],
    next: "/admin/onboarding?step=3",
    nextLabel: "Continuar",
  },
  {
    icon: "🚀",
    title: "Pronto para começar?",
    subtitle: "Crie seu primeiro evento em menos de 2 minutos",
    body: "Você vai precisar apenas do nome do casal, data e local da cerimônia. O resto você pode preencher depois.",
    next: "/admin/eventos/novo",
    nextLabel: "Criar meu primeiro evento",
    skip: "/admin",
  },
];

export default async function OnboardingPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Quem já completou o onboarding não precisa ver de novo
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true },
  });
  if (user?.onboardingCompleted) redirect("/admin");

  const { step: stepStr } = await searchParams;
  const stepIndex = Math.max(0, Math.min(2, parseInt(stepStr ?? "1", 10) - 1));
  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-serif text-3xl tracking-widest text-foreground">Voem.</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border/40 p-8">
          {/* Step indicator */}
          <div className="flex justify-center gap-1.5 mb-8">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex ? "w-8 bg-primary" : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="text-center space-y-4">
            <div className="text-5xl">{step.icon}</div>
            <div>
              <h1 className="text-xl font-semibold">{step.title}</h1>
              {step.subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{step.subtitle}</p>
              )}
            </div>

            {step.body && (
              <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
            )}

            {step.features && (
              <ul className="text-left space-y-2.5 mt-2">
                {step.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-3 text-sm">
                    <span className="text-base shrink-0">{f.icon}</span>
                    <span>{f.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3">
            {isLastStep ? (
              // Último passo: marca onboardingCompleted antes de redirecionar
              <>
                <form action={completeOnboarding}>
                  <input type="hidden" name="redirectTo" value={step.next} />
                  <button
                    type="submit"
                    className="w-full text-center bg-primary text-primary-foreground rounded-lg py-3 text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    {step.nextLabel}
                  </button>
                </form>
                {"skip" in step && step.skip && (
                  <form action={completeOnboarding}>
                    <input type="hidden" name="redirectTo" value={step.skip} />
                    <button
                      type="submit"
                      className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      Ir para o painel
                    </button>
                  </form>
                )}
              </>
            ) : (
              <Link
                href={step.next}
                className="w-full text-center bg-primary text-primary-foreground rounded-lg py-3 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {step.nextLabel}
              </Link>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Passo {stepIndex + 1} de {STEPS.length}
        </p>
      </div>
    </div>
  );
}
