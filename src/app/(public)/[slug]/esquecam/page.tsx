import { ForgetMeForm } from "@/components/guest/forget-me-form";
import { getCurrentGuest } from "@/lib/auth/guest";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Remover meus dados" };

export default async function ForgetMePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guest = await getCurrentGuest(slug);

  return (
    <div className="px-4 py-6 max-w-sm mx-auto flex flex-col gap-6">
      <div>
        <h1
          className="text-2xl font-semibold mb-1"
          style={{ fontFamily: "var(--theme-font-heading)" }}
        >
          Remover meus dados
        </h1>
        <p className="text-sm text-[var(--theme-secondary)]">
          Exercício do direito ao esquecimento (LGPD Art. 18, IV).
        </p>
      </div>

      <div className="rounded-[var(--theme-radius)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Seus dados pessoais serão ocultados imediatamente. A remoção
        definitiva ocorre em até 30 dias.
      </div>

      <ForgetMeForm slug={slug} guestEmail={guest?.email ?? null} />
    </div>
  );
}
