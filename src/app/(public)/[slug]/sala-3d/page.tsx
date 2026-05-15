import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function PublicSala3DPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug }, select: { id: true } });
  if (!event) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <p className="text-4xl">🏛️</p>
        <h1 className="text-xl font-semibold">Mapa do Salão</h1>
        <p className="text-muted-foreground text-sm">Em breve</p>
      </div>
    </main>
  );
}
