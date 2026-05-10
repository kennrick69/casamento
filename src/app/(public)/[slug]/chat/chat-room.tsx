"use client";

import { useEffect, useRef, useState, useTransition, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sendMessage, toggleReaction } from "./actions";

interface Message {
  id: string;
  content: string;
  guestName: string;
  guestId: string;
  reactions: Record<string, string[]>;
  createdAt: string;
}

interface ChatRoomProps {
  slug: string;
  eventId: string;
  initialMessages: Message[];
  guestId: string | null;
  coupleGuestIds: string[];
  pusherKey: string | null;
  pusherCluster: string | null;
}

const PALETTE = [
  "#e07b54", "#6b9e78", "#6b86ae", "#b07db5",
  "#c8a84b", "#7db5b0", "#a86b6b", "#7b8fb5",
];

function colorForGuest(guestId: string): string {
  let h = 0;
  for (let i = 0; i < guestId.length; i++) h = (h * 31 + guestId.charCodeAt(i)) & 0xffffffff;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

const CHAT_EMOJIS = ["❤️", "😂", "🥹", "🎉", "👏"] as const;

function humanize(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { locale: ptBR, addSuffix: true });
  } catch {
    return "";
  }
}

export function ChatRoom({
  slug,
  eventId,
  initialMessages,
  guestId,
  coupleGuestIds,
  pusherKey,
  pusherCluster,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [unreadCount, setUnreadCount] = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const [reactionPicker, setReactionPicker] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const coupleSet = new Set(coupleGuestIds);

  // Pusher connection
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
        setAtBottom((bottom) => {
          if (!bottom) setUnreadCount((n) => n + 1);
          return bottom;
        });
      });

      channel.bind("chat-reaction", ({ messageId, reactions }: { messageId: string; reactions: Record<string, string[]> }) => {
        setMessages((prev) =>
          prev.map((m) => m.id === messageId ? { ...m, reactions } : m)
        );
      });
    });

    return () => {
      channel?.unbind_all();
      pusher?.disconnect();
    };
  }, [eventId, guestId, pusherKey, pusherCluster]);

  // Scroll management
  useEffect(() => {
    if (atBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount(0);
    }
  }, [messages, atBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAtBottom(isBottom);
    if (isBottom) setUnreadCount(0);
  }, []);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setAtBottom(true);
    setUnreadCount(0);
  }

  // Image paste
  async function handlePaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((i) => i.type.startsWith("image/"));
    if (!imageItem || !guestId) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("slug", slug);
    fd.set("guestId", guestId);
    await fetch("/api/fotos/upload", { method: "POST", body: fd }).catch(() => null);
  }

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

  function handleToggleReaction(messageId: string, emoji: string) {
    if (!guestId) return;
    setReactionPicker(null);
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("messageId", messageId);
    fd.set("emoji", emoji);
    startTransition(async () => {
      const result = await toggleReaction(fd);
      if (result?.reactions) {
        setMessages((prev) =>
          prev.map((m) => m.id === messageId ? { ...m, reactions: result.reactions } : m)
        );
      }
    });
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      <div className="px-4 pt-5 pb-3 border-b border-[var(--theme-border)]">
        <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--theme-font-heading)" }}>
          Chat
        </h1>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 relative"
        onClick={() => setReactionPicker(null)}
      >
        {messages.length === 0 && (
          <p className="text-sm text-[var(--theme-secondary)] text-center py-6">
            Nenhuma mensagem ainda. Diga oi!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.guestId === guestId;
          const isCouple = coupleSet.has(msg.guestId);
          const color = colorForGuest(msg.guestId);
          const totalReactions = Object.values(msg.reactions).reduce((a, b) => a + b.length, 0);

          return (
            <div
              key={msg.id}
              className={`group flex flex-col max-w-[80%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
            >
              {!isMe && (
                <span className="text-xs mb-0.5 px-1 flex items-center gap-1" style={{ color }}>
                  {msg.guestName}
                  {isCouple && (
                    <span className="text-[9px] bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] px-1 py-0.5 rounded-full leading-none">
                      Casal
                    </span>
                  )}
                </span>
              )}
              <div className="relative">
                <button
                  className={`px-3 py-2 rounded-2xl text-sm text-left ${
                    isMe
                      ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] rounded-br-sm"
                      : "bg-[var(--theme-muted)] text-[var(--theme-foreground)] rounded-bl-sm"
                  }`}
                  onDoubleClick={() => guestId && setReactionPicker(reactionPicker === msg.id ? null : msg.id)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {msg.content}
                </button>

                {/* Reaction picker */}
                {reactionPicker === msg.id && (
                  <div className="absolute bottom-full mb-1 left-0 bg-background border border-border rounded-full px-2 py-1 flex gap-1 shadow-md z-10">
                    {CHAT_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={(e) => { e.stopPropagation(); handleToggleReaction(msg.id, emoji); }}
                        className="text-lg hover:scale-125 transition-transform leading-none"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reaction bubbles */}
              {totalReactions > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 px-1">
                  {Object.entries(msg.reactions).map(([emoji, ids]) => {
                    const mine = guestId ? ids.includes(guestId) : false;
                    return ids.length > 0 ? (
                      <button
                        key={emoji}
                        onClick={(e) => { e.stopPropagation(); handleToggleReaction(msg.id, emoji); }}
                        className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${mine ? "border-[var(--theme-primary)] bg-[var(--theme-primary)]/10" : "border-[var(--theme-border)] bg-[var(--theme-muted)]"}`}
                      >
                        {emoji} {ids.length}
                      </button>
                    ) : null;
                  })}
                </div>
              )}

              <span className="text-[10px] text-[var(--theme-secondary)] mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {humanize(msg.createdAt)}
              </span>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* "X new messages" banner */}
      {!atBottom && unreadCount > 0 && (
        <button
          onClick={scrollToBottom}
          className="mx-4 mb-1 py-1.5 text-xs rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] transition-opacity shadow"
        >
          {unreadCount} nova{unreadCount !== 1 ? "s" : ""} mensagem{unreadCount !== 1 ? "ns" : ""} ↓
        </button>
      )}

      {guestId ? (
        <form
          onSubmit={handleSend}
          className="px-4 py-3 border-t border-[var(--theme-border)] flex gap-2 bg-[var(--theme-background)]"
        >
          <label htmlFor="chat-input" className="sr-only">Mensagem</label>
          <input
            id="chat-input"
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={handlePaste}
            placeholder="Mensagem…"
            maxLength={500}
            disabled={isPending}
            aria-label="Mensagem"
            className="flex-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-muted)] px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--theme-primary)] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isPending || !text.trim()}
            className="rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] px-4 py-2 text-sm disabled:opacity-40 transition-opacity"
          >
            {isPending ? "…" : "Enviar"}
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
