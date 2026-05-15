import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PublicSala3DClient } from "./PublicSala3DClient";

export default async function PublicSala3DPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      coupleNames: true,
      venue3d: {
        include: {
          objects: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!event) notFound();
  if (!event.venue3d) {
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

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 text-center">🏛️ Mapa do Salão</h1>
        <PublicSala3DClient venue={event.venue3d} coupleNames={event.coupleNames} />
      </div>
    </main>
  );
}
