"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendMessage } from "./actions";

interface Message {
  id: string;
  content: string;
  guestName: string;
  guestId: string;
  createdAt: string;
}

interface ChatRoomProps {
  slug: string;
  eventId: string;
  initialMessages: Message[];
  guestId: string | null;
  guestName: string | null;
  pusherKey: string | null;
  pusherCluster: string | null;
}

export function ChatRoom({
  slug,
  eventId,
  initialMessages,
  guestId,
  guestName: _guestName,
  pusherKey,
  pusherCluster,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Conecta ao Pusher se disponível
  useEffect(() => {
    if (!pusherKey || !pusherCluster) return;

    type PusherInstance = import("pusher-js").default;
    type PusherChannel = ReturnType<PusherInstance["subscribe"]>;
    let pusher: PusherInstance | null = null;
    let channel: PusherChannel | null = null;

    import("pusher-js").then(({ default: Pusher }) => {
      pusher = new Pusher(pusherKey, { cluster: pusherCluster });
      channel = pusher.subscribe(`event-${eventId}`);
      channel.bind("chat-message", (msg: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });
    });

    return () => {
      channel?.unbind_all();
      pusher?.disconnect();
    };
  }, [eventId, pusherKey, pusherCluster]);

  // Scroll para o fim quando chegam mensagens
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !guestId) return;

    setText("");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("content", content);
      fd.set("slug", slug);
      const result = await sendMessage(fd);
      if (result?.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === result.message!.id)) return prev;
          return [...prev, result.message!];
        });
      }
    });
    inputRef.current?.focus();
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 120px)" }}
    >
      <div className="px-4 pt-5 pb-3 border-b border-[var(--theme-border)]">
        <h1
          className="text-xl font-semibold"
          style={{ fontFamily: "var(--theme-font-heading)" }}
        >
          Chat
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--theme-secondary)] text-center py-6">
            Nenhuma mensagem ainda. Diga oi!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.guestId === guestId;
          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[80%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
            >
              {!isMe && (
                <span className="text-xs text-[var(--theme-secondary)] mb-0.5 px-1">
                  {msg.guestName}
                </span>
              )}
              <div
                className={`px-3 py-2 rounded-2xl text-sm ${
                  isMe
                    ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] rounded-br-sm"
                    : "bg-[var(--theme-muted)] text-[var(--theme-foreground)] rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-[var(--theme-secondary)] mt-0.5 px-1">
                {msg.createdAt}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {guestId ? (
        <form
          onSubmit={handleSend}
          className="px-4 py-3 border-t border-[var(--theme-border)] flex gap-2 bg-[var(--theme-background)]"
        >
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensagem…"
            maxLength={500}
            disabled={isPending}
            className="flex-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-muted)] px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--theme-primary)] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isPending || !text.trim()}
            className="rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] px-4 py-2 text-sm disabled:opacity-40 transition-opacity"
          >
            Enviar
          </button>
        </form>
      ) : (
        <div className="px-4 py-3 border-t border-[var(--theme-border)] text-sm text-[var(--theme-secondary)] text-center">
          <a href={`/${slug}/rsvp`} className="underline font-medium">
            Confirme sua presença
          </a>{" "}
          para enviar mensagens.
        </div>
      )}
    </div>
  );
}
