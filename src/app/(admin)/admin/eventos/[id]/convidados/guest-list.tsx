"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GuestActions } from "./guest-actions";
import { bulkBanGuests, bulkRemoveGuests, importGuestsFromCsv } from "./actions";

type RsvpStatus = "CONFIRMED" | "DECLINED" | "PENDING";

interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plusOnes: number;
  dietaryRestrictions: string | null;
  rsvpStatus: RsvpStatus;
  banned: boolean;
  createdAt: Date;
}

interface Props {
  guests: Guest[];
  eventId: string;
}

type FilterTab = "all" | "confirmed" | "declined" | "pending" | "banned";

const FILTER_LABELS: Record<FilterTab, string> = {
  all: "Todos",
  confirmed: "Confirmados",
  declined: "Recusados",
  pending: "Pendentes",
  banned: "Banidos",
};

export function GuestList({ guests, eventId }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isBulkPending, startBulk] = useTransition();
  const [isImportPending, startImport] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = guests.filter((g) => {
    const matchesSearch =
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.email.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "confirmed" && g.rsvpStatus === "CONFIRMED") ||
      (filter === "declined" && g.rsvpStatus === "DECLINED") ||
      (filter === "pending" && g.rsvpStatus === "PENDING") ||
      (filter === "banned" && g.banned);

    return matchesSearch && matchesFilter;
  });

  // ── Selection ────────────────────────────────────────────────────────────

  const allSelected = filtered.length > 0 && filtered.every((g) => selected.has(g.id));

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((g) => next.delete(g.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((g) => next.add(g.id));
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────

  function bulkAction(action: "ban" | "unban" | "remove") {
    const ids = Array.from(selected);
    if (!ids.length) return;

    startBulk(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      ids.forEach((id) => fd.append("guestId", id));

      if (action === "remove") {
        const result = await bulkRemoveGuests(fd);
        if (result.ok) {
          toast.success(`${result.count} convidado${result.count !== 1 ? "s" : ""} removido${result.count !== 1 ? "s" : ""}.`);
          setSelected(new Set());
        }
      } else {
        fd.set("ban", action === "ban" ? "true" : "false");
        const result = await bulkBanGuests(fd);
        if (result.ok) {
          toast.success(
            action === "ban"
              ? `${result.count} convidado${result.count !== 1 ? "s" : ""} banido${result.count !== 1 ? "s" : ""}.`
              : `${result.count} convidado${result.count !== 1 ? "s" : ""} desbanido${result.count !== 1 ? "s" : ""}.`
          );
          setSelected(new Set());
        }
      }
    });
  }

  // ── CSV import ────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    startImport(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("file", file);
      const result = await importGuestsFromCsv(fd);
      if (result.ok) {
        const msg = `${result.imported} importado${result.imported !== 1 ? "s" : ""}${result.skipped ? `, ${result.skipped} ignorado${result.skipped !== 1 ? "s" : ""}` : ""}.`;
        toast.success(msg);
        if (result.errors.length) {
          result.errors.slice(0, 3).forEach((err) => toast.error(err));
        }
      } else {
        toast.error(result.errors[0] ?? "Falha ao importar.");
      }
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  // ── Status badge ──────────────────────────────────────────────────────────

  const statusBadge: Record<RsvpStatus, string> = {
    CONFIRMED: "bg-green-100 text-green-800",
    DECLINED: "bg-red-100 text-red-700",
    PENDING: "bg-yellow-100 text-yellow-800",
  };
  const statusLabel: Record<RsvpStatus, string> = {
    CONFIRMED: "Confirmado",
    DECLINED: "Recusado",
    PENDING: "Pendente",
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const counts = {
    all: guests.length,
    confirmed: guests.filter((g) => g.rsvpStatus === "CONFIRMED").length,
    declined: guests.filter((g) => g.rsvpStatus === "DECLINED").length,
    pending: guests.filter((g) => g.rsvpStatus === "PENDING").length,
    banned: guests.filter((g) => g.banned).length,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search + import */}
      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Buscar por nome ou e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <label className={`flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm cursor-pointer hover:bg-muted transition-colors ${isImportPending ? "opacity-50 cursor-wait" : ""}`}>
          <span>{isImportPending ? "Importando…" : "Importar CSV"}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            disabled={isImportPending}
            onChange={handleFileChange}
          />
        </label>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {(Object.entries(FILTER_LABELS) as [FilterTab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-muted rounded-lg text-sm">
          <span className="font-medium">{selected.size} selecionado{selected.size !== 1 ? "s" : ""}</span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => bulkAction("ban")}
              disabled={isBulkPending}
              className="px-3 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs disabled:opacity-50"
            >
              Banir
            </button>
            <button
              onClick={() => bulkAction("unban")}
              disabled={isBulkPending}
              className="px-3 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs disabled:opacity-50"
            >
              Desbanir
            </button>
            <button
              onClick={() => bulkAction("remove")}
              disabled={isBulkPending}
              className="px-3 py-1 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs disabled:opacity-50"
            >
              Remover
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Guest list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {search || filter !== "all" ? "Nenhum resultado para esta busca." : "Nenhum convidado ainda."}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {/* Select all row */}
          <div className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="size-4 rounded"
            />
            <span>{allSelected ? "Desmarcar todos" : "Selecionar todos"} ({filtered.length})</span>
          </div>

          {filtered.map((guest) => (
            <div
              key={guest.id}
              className={`bg-background border rounded-lg px-4 py-3 flex items-start gap-3 transition-colors ${
                selected.has(guest.id) ? "border-primary/40 bg-primary/3" : "border-border"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(guest.id)}
                onChange={() => toggleOne(guest.id)}
                className="mt-1 size-4 rounded shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                  <p className="font-medium text-sm truncate">{guest.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusBadge[guest.rsvpStatus]}`}>
                    {statusLabel[guest.rsvpStatus]}
                  </span>
                  {guest.banned && (
                    <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                      banido
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{guest.email}</p>
                {guest.phone && (
                  <p className="text-xs text-muted-foreground">{guest.phone}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-1">
                  {guest.plusOnes > 0 && (
                    <span className="text-xs text-muted-foreground">
                      +{guest.plusOnes} acomp.
                    </span>
                  )}
                  {guest.dietaryRestrictions && (
                    <span className="text-xs text-muted-foreground">
                      🍽 {guest.dietaryRestrictions}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {format(guest.createdAt, "d MMM yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
              <div className="shrink-0">
                <GuestActions guestId={guest.id} eventId={eventId} banned={guest.banned} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
