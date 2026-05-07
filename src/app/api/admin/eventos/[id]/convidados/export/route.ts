import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    await requireOrganizer(id);
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const guests = await prisma.guest.findMany({
    where: { eventId: id, deletedAt: null },
    orderBy: [{ rsvpStatus: "asc" }, { name: "asc" }],
  });

  const header = "Nome,Email,Telefone,Status,Acompanhantes,Restrições alimentares,Mensagem,Data\n";
  const rows = guests
    .map((g) =>
      [
        `"${g.name}"`,
        `"${g.email}"`,
        `"${g.phone ?? ""}"`,
        g.rsvpStatus,
        g.plusOnes,
        `"${g.dietaryRestrictions ?? ""}"`,
        `"${(g.message ?? "").replace(/"/g, '""')}"`,
        g.createdAt.toISOString().split("T")[0],
      ].join(",")
    )
    .join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="convidados-${id}.csv"`,
    },
  });
}
