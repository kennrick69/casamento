import { redirect } from "next/navigation";

// Rota legada — redireciona para /locais (nova página de múltiplos locais).
export default async function LocalRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { slug } = await params;
  const { k } = await searchParams;
  redirect(`/${slug}/locais${k ? `?k=${k}` : ""}`);
}
