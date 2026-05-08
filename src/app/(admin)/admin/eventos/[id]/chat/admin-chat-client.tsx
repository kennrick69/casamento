"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { removeMessage, restoreMessage, silenceGuest } from "./actions";

interface Msg {
  id: string;
  content: string;
  guestName: string;
  guestId: string;
  banned: boolean;
  removedAt: string | null;
  createdAt: string;
}

function humanize(iso: string) {
  try { return formatDistanceToNow(new Date(iso), { locale: ptBR, addSuffix: true }); } catch { return ""; }
}

function MessageRow({ msg, eventId }: { msg: Msg; eventId: string }) {
  const [isPending, start] = useTransition();
  const removed = !!msg.removedAt;

  function act(action: (fd: FormData) => Promise<{ ok: boolean }>, extra?: Record<string, string>) {
    start(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      if (extra) for (const [k, v] of Object.entries(extra)) fd.set(k, v);
      const result = await action(fd);
      if (!result.ok) toast.error("Falha na ação.");
    });
  }

  return (
    <div className={`border rounded-lg px-3 py-2 text-sm flex flex-col gap-1 ${removed ? "opacity-50 bg-muted" : "bg-background"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-xs">{msg.guestName}</span>
          {msg.banned && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Banido</span>}
          {removed && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">Removida</span>}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{humanize(msg.createdAt)}</span>
      </div>
      <p className="text-muted-foreground">{msg.content}</p>
      <div className="flex gap-2 mt-0.5">
        {!removed ? (
          <button
            onClick={() => act(removeMessage, { messageId: msg.id })}
            disabled={isPending}
            className="text-xs text-red-600 hover:underline disabled:opacity-60"
          >
            Remover
          </button>
        ) : (
          <button
            onClick={() => act(restoreMessage, { messageId: msg.id })}
            disabled={isPending}
            className="text-xs text-muted-foreground hover:underline disabled:opacity-60"
          >
            Restaurar
          </button>
        )}
        {!msg.banned ? (
          <button
            onClick={() => act(silenceGuest, { guestId: msg.guestId, ban: "true" })}
            disabled={isPending}
            className="text-xs text-amber-600 hover:underline disabled:opacity-60"
          >
            Silenciar convidado
          </button>
        ) : (
          <button
            onClick={() => act(silenceGuest, { guestId: msg.guestId, ban: "false" })}
            disabled={isPending}
            className="text-xs text-muted-foreground hover:underline disabled:opacity-60"
          >
            Reativar convidado
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminChatClient({ messages, eventId }: { messages: Msg[]; eventId: string }) {
  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">Nenhuma mensagem ainda.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {messages.map((msg) => (
        <MessageRow key={msg.id} msg={msg} eventId={eventId} />
      ))}
    </div>
  );
}
