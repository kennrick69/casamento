import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { approvePhoto, removePhoto } from "./actions";
import Image from "next/image";

interface Props { params: Promise<{ id: string }> }

export default async function MuralAdminPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const photos = await prisma.photo.findMany({
    where: { eventId, removedAt: null },
    orderBy: { createdAt: "desc" },
    include: { guest: { select: { name: true } } },
  });

  const pending = photos.filter((p) => !p.approvedByCouple);
  const approved = photos.filter((p) => p.approvedByCouple);

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Mural" />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />
        <h1 className="text-2xl font-bold mb-2">Mural de fotos</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {photos.length} fotos · {pending.length} aguardando aprovação
        </p>

        {pending.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-semibold mb-3 text-amber-700">Aguardando aprovação ({pending.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pending.map((photo) => (
                <PhotoCard key={photo.id} photo={photo} eventId={eventId} baseUrl={baseUrl} showApprove />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-base font-semibold mb-3">Aprovadas ({approved.length})</h2>
          {approved.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma foto aprovada.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {approved.map((photo) => (
                <PhotoCard key={photo.id} photo={photo} eventId={eventId} baseUrl={baseUrl} showApprove={false} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function PhotoCard({
  photo,
  eventId,
  baseUrl,
  showApprove,
}: {
  photo: { id: string; storageKey: string; guest: { name: string } };
  eventId: string;
  baseUrl: string;
  showApprove: boolean;
}) {
  const src = `${baseUrl}/api/photos/${encodeURIComponent(photo.storageKey)}`;
  return (
    <div className="border rounded-lg overflow-hidden flex flex-col">
      <div className="relative aspect-square bg-muted">
        <Image src={src} alt={photo.guest.name} fill className="object-cover" unoptimized />
      </div>
      <div className="p-2 flex flex-col gap-1">
        <p className="text-xs text-muted-foreground truncate">{photo.guest.name}</p>
        <div className="flex gap-1">
          {showApprove && (
            <form action={approvePhoto} className="flex-1">
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="photoId" value={photo.id} />
              <button type="submit" className="w-full text-xs py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors">
                Aprovar
              </button>
            </form>
          )}
          <form action={removePhoto} className="flex-1">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="photoId" value={photo.id} />
            <button type="submit" className="w-full text-xs py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
              Remover
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
