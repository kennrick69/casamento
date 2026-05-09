import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { ReportActions } from "./report-actions";
import { MuralActions } from "./mural-actions";
import { PlaylistActions } from "./playlist-actions";
import { BannedGuestActions } from "./banned-guest-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { storage } from "@/lib/storage";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Moderação" };

interface Props { params: Promise<{ id: string }> }

export default async function ModeracaoPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  const [reports, pendingPhotos, pendingSongs, bannedGuests] = await Promise.all([
    prisma.report.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { name: true } },
        photo: { select: { id: true, storageKey: true } },
        chatMessage: { select: { id: true, content: true } },
      },
    }),
    prisma.photo.findMany({
      where: { eventId, approvedByCouple: false, removedAt: null },
      orderBy: { createdAt: "desc" },
      include: { guest: { select: { name: true } } },
    }),
    prisma.playlistSuggestion.findMany({
      where: { eventId, songStatus: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { guest: { select: { name: true } } },
    }),
    prisma.guest.findMany({
      where: { eventId, banned: true, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, email: true, updatedAt: true },
    }),
  ]);

  const pendingReports = reports.filter((r) => r.status === "PENDING");
  const resolvedReports = reports.filter((r) => r.status !== "PENDING");

  const badgeClass = "ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground";

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Moderação" eventId={eventId} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />
        <h1 className="text-2xl font-bold mb-6">Moderação centralizada</h1>

        <Tabs defaultValue="denuncias">
          <TabsList className="w-full mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="denuncias" className="flex items-center">
              Denúncias
              {pendingReports.length > 0 && <span className={badgeClass}>{pendingReports.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="mural" className="flex items-center">
              Mural
              {pendingPhotos.length > 0 && <span className={badgeClass}>{pendingPhotos.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="playlist" className="flex items-center">
              Playlist
              {pendingSongs.length > 0 && <span className={badgeClass}>{pendingSongs.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="banidos" className="flex items-center">
              Banidos
              {bannedGuests.length > 0 && <span className={badgeClass}>{bannedGuests.length}</span>}
            </TabsTrigger>
          </TabsList>

          {/* Denúncias */}
          <TabsContent value="denuncias">
            <p className="text-sm text-muted-foreground mb-4">
              {pendingReports.length} denúncia{pendingReports.length !== 1 ? "s" : ""} pendente{pendingReports.length !== 1 ? "s" : ""}
            </p>

            {pendingReports.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">Nenhuma denúncia pendente. ✓</p>
            )}

            {pendingReports.map((report) => (
              <div key={report.id} className="border rounded-lg p-4 mb-3">
                <div className="mb-3">
                  <p className="text-sm font-medium">
                    {report.targetType === "PHOTO" ? "Foto" : "Mensagem"} denunciada
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Por {report.reporter.name} · {format(report.createdAt, "d MMM yyyy", { locale: ptBR })}
                  </p>
                  {report.reason && <p className="text-xs mt-1 italic">&ldquo;{report.reason}&rdquo;</p>}
                </div>
                {report.chatMessage && (
                  <div className="bg-muted rounded p-3 text-sm mb-3 break-words">
                    {report.chatMessage.content}
                  </div>
                )}
                <ReportActions
                  eventId={eventId}
                  reportId={report.id}
                  photoId={report.photoId}
                  chatMessageId={report.chatMessageId}
                />
              </div>
            ))}

            {resolvedReports.length > 0 && (
              <details className="mt-4">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                  Ver resolvidas ({resolvedReports.length})
                </summary>
                <div className="mt-3 flex flex-col gap-2">
                  {resolvedReports.map((report) => (
                    <div key={report.id} className="border rounded p-3 text-sm text-muted-foreground">
                      {report.targetType === "PHOTO" ? "Foto" : "Mensagem"} ·{" "}
                      <span className={report.status === "REMOVED" ? "text-red-600" : "text-green-700"}>
                        {report.status === "REMOVED" ? "Removido" : "Descartado"}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </TabsContent>

          {/* Mural */}
          <TabsContent value="mural">
            <p className="text-sm text-muted-foreground mb-4">
              {pendingPhotos.length} foto{pendingPhotos.length !== 1 ? "s" : ""} aguardando aprovação
            </p>
            {pendingPhotos.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">Nenhuma foto pendente. ✓</p>
            )}
            {pendingPhotos.map((photo) => (
              <MuralActions
                key={photo.id}
                photo={{ id: photo.id, photoUrl: storage.getUrl(photo.storageKey), guest: photo.guest, caption: photo.caption }}
                eventId={eventId}
              />
            ))}
          </TabsContent>

          {/* Playlist */}
          <TabsContent value="playlist">
            <p className="text-sm text-muted-foreground mb-4">
              {pendingSongs.length} música{pendingSongs.length !== 1 ? "s" : ""} aguardando aprovação
            </p>
            {pendingSongs.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">Nenhuma música pendente. ✓</p>
            )}
            {pendingSongs.map((song) => (
              <PlaylistActions key={song.id} song={song} eventId={eventId} />
            ))}
          </TabsContent>

          {/* Banidos */}
          <TabsContent value="banidos">
            <p className="text-sm text-muted-foreground mb-4">
              {bannedGuests.length} convidado{bannedGuests.length !== 1 ? "s" : ""} banido{bannedGuests.length !== 1 ? "s" : ""}
            </p>
            {bannedGuests.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">Nenhum convidado banido. ✓</p>
            )}
            {bannedGuests.map((g) => (
              <BannedGuestActions key={g.id} guest={g} eventId={eventId} />
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
