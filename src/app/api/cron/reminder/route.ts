import { getAppUrl } from "@/lib/app-url";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { email } from "@/lib/email";
import { formatEventDate } from "@/lib/timezone";
import { reminderHtml, reminderText } from "@/lib/email/templates";
import { differenceInCalendarDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const REMINDER_DAYS = [7, 1];

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const today = new Date();
  const baseUrl = getAppUrl();

  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED", archivedAt: null },
    select: {
      id: true,
      slug: true,
      title: true,
      coupleNames: true,
      ceremonyDate: true,
      ceremonyLocation: true,
      timezone: true,
      guests: {
        where: { rsvpStatus: "CONFIRMED", deletedAt: null, banned: false },
        select: { id: true, name: true, email: true },
      },
    },
  });

  let sent = 0;

  for (const event of events) {
    const localCeremony = toZonedTime(event.ceremonyDate, event.timezone);
    const daysLeft = differenceInCalendarDays(localCeremony, today);

    if (!REMINDER_DAYS.includes(daysLeft)) continue;

    const dateLabel = formatEventDate(
      event.ceremonyDate,
      event.timezone,
      "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm"
    );
    const eventUrl = `${baseUrl}/${event.slug}`;

    for (const guest of event.guests) {
      if (!guest.email) continue;

      await email
        .send({
          to: guest.email,
          subject: `${daysLeft === 1 ? "Amanhã é o dia!" : "Faltam 7 dias!"} — ${event.coupleNames}`,
          idempotencyKey: `reminder-${daysLeft}d-${guest.id}-${event.id}`,
          html: reminderHtml({
            name: guest.name,
            eventTitle: event.title,
            coupleNames: event.coupleNames,
            dateLabel,
            location: event.ceremonyLocation ?? "",
            daysLeft,
            eventUrl,
          }),
          text: reminderText({
            name: guest.name,
            eventTitle: event.title,
            coupleNames: event.coupleNames,
            dateLabel,
            location: event.ceremonyLocation ?? "",
            daysLeft,
            eventUrl,
          }),
        })
        .catch(() => null);

      sent++;
    }
  }

  return NextResponse.json({ ok: true, sent });
}
