"use client";

import { useState } from "react";
import { Bell, BellOff } from "lucide-react";

interface ScheduleItem {
  time: string;
  title: string;
}

interface Props {
  items: ScheduleItem[];
  ceremonyDate: string;
  timezone: string;
}

function parseTime(timeStr: string, dateStr: string): Date | null {
  const match = timeStr.match(/(\d{1,2})[:h](\d{2})?/);
  if (!match) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const hour = parseInt(match[1]);
  const min = parseInt(match[2] ?? "0");
  const dt = new Date(y, m - 1, d, hour, min);
  return isNaN(dt.getTime()) ? null : dt;
}

export function NotificationButton({ items, ceremonyDate, timezone }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  if (typeof Notification === "undefined") return null;

  async function enable() {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== "granted") return;

    const dateStr = ceremonyDate.split("T")[0];
    let scheduled = 0;

    for (const item of items) {
      const t = parseTime(item.time, dateStr);
      if (!t) continue;
      const warningMs = t.getTime() - 5 * 60 * 1000 - Date.now();
      if (warningMs <= 0) continue;

      setTimeout(() => {
        new Notification(`${item.title} — em 5 minutos`, {
          body: `Horário: ${item.time}`,
          icon: "/icons/icon-192x192.png",
        });
      }, warningMs);
      scheduled++;
    }

    if (scheduled > 0) setEnabled(true);
  }

  function disable() {
    setEnabled(false);
  }

  if (permission === "denied") {
    return (
      <p className="text-xs text-muted-foreground">
        Notificações bloqueadas no navegador. Ative nas configurações do dispositivo.
      </p>
    );
  }

  return (
    <button
      onClick={enabled ? disable : enable}
      className="flex items-center gap-2 rounded-lg border border-[var(--theme-border)] px-3 py-2 text-xs font-medium hover:bg-[var(--theme-muted)] transition-colors"
      style={{ color: enabled ? "var(--theme-primary)" : "var(--theme-secondary)" }}
    >
      {enabled ? <Bell size={14} /> : <BellOff size={14} />}
      {enabled ? "Lembretes ativados" : "Ativar lembretes (5 min antes)"}
    </button>
  );
}
