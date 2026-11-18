import { prisma } from "@/lib/db";

// Aplica o skin do Modo Gamificado ao painel DESTE evento quando
// experienceType = GAMIFIED. Envolve as páginas num wrapper com
// `data-game-skin`, que redefine os tokens de tema (ver globals.css). Evento
// clássico: nenhum wrapper, painel idêntico ao de hoje. Zero regressão.
export default async function EventAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { experienceType: true, gameSkin: true },
  });

  if (!event || event.experienceType !== "GAMIFIED") {
    return <>{children}</>;
  }

  return (
    <div className="game-skin min-h-screen bg-background text-foreground" data-game-skin={event.gameSkin.toLowerCase()}>
      {children}
    </div>
  );
}
