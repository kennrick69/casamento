"use client";

import { useState, useTransition } from "react";
import {
  createTable,
  deleteTable,
  assignGuest,
  unassignGuest,
  setSeatLock,
  releaseGuestSeats,
  moveGuestSeats,
} from "./actions";
import { Users, Plus, Trash2, GripVertical, Lock, Unlock, Armchair } from "lucide-react";

interface Guest {
  id: string;
  name: string;
  email: string;
  plusOnes: number;
  rsvpStatus: string;
}

interface Assignment {
  guestId: string;
}

interface Table {
  id: string;
  name: string;
  capacity: number;
  order: number;
  assignments: Assignment[];
}

interface SeatRow {
  id: string;
  tableId: string;
  seatIndex: number;
  guestId: string | null;
  companionId: string | null;
  claimedById: string | null;
  holderName: string | null;
  locked: boolean;
  isChild: boolean;
}

interface Props {
  eventId: string;
  tables: Table[];
  guests: Guest[];
  guestMap: Record<string, Guest>;
  seats: SeatRow[];
  infantsByGuest: Record<string, number>;
}

export function MesasClient({ eventId, tables: initialTables, guests, guestMap, seats, infantsByGuest }: Props) {
  const [tables, setTables] = useState(initialTables);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCap, setNewTableCap] = useState(8);
  const [dragging, setDragging] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const assignedGuestIds = new Set(tables.flatMap((t) => t.assignments.map((a) => a.guestId)));
  const unassigned = guests.filter((g) => !assignedGuestIds.has(g.id) && g.rsvpStatus !== "DECLINED");

  function handleCreate() {
    if (!newTableName.trim()) return;
    startTransition(async () => {
      void await createTable(eventId, newTableName.trim(), newTableCap);
      setNewTableName("");
      setNewTableCap(8);
    });
  }

  function handleDelete(tableId: string) {
    if (!confirm("Excluir mesa? Os convidados alocados ficam sem mesa.")) return;
    startTransition(async () => { void await deleteTable(eventId, tableId); });
  }

  function handleDragStart(guestId: string) {
    setDragging(guestId);
  }

  function handleDrop(tableId: string) {
    if (!dragging) return;
    startTransition(async () => { void await assignGuest(eventId, tableId, dragging); });
    setDragging(null);
  }

  function handleDropUnassigned() {
    if (!dragging) return;
    startTransition(async () => { void await unassignGuest(eventId, dragging); });
    setDragging(null);
  }

  function handleDirectAssign(tableId: string, guestId: string) {
    if (!guestId) return;
    startTransition(async () => { void await assignGuest(eventId, tableId, guestId); });
  }

  // S4b: travar/soltar cadeira, mover/liberar a família que escolheu no jogo.
  function handleLock(tableId: string, index: number, locked: boolean) {
    startTransition(async () => { void await setSeatLock(eventId, tableId, index, locked); });
  }
  function handleRelease(guestId: string) {
    if (!confirm("Liberar os lugares desta família? As cadeiras ficam livres de novo.")) return;
    startTransition(async () => { void await releaseGuestSeats(eventId, guestId); });
  }
  function handleMove(guestId: string, toTableId: string) {
    if (!toTableId) return;
    startTransition(async () => {
      const r = await moveGuestSeats(eventId, guestId, toTableId);
      if (r && !r.ok && r.message) alert(r.message);
    });
  }

  const seatsTaken = (t: Table) => t.assignments.length;

  return (
    <div className="flex gap-6 h-[calc(100vh-180px)]">
      {/* Unassigned sidebar */}
      <aside
        className="w-64 shrink-0 flex flex-col border rounded-lg bg-background overflow-hidden"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropUnassigned}
      >
        <div className="px-3 py-2 border-b bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Sem mesa ({unassigned.length})
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {unassigned.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Todos alocados!</p>
          )}
          {unassigned.map((g) => (
            <div
              key={g.id}
              draggable
              onDragStart={() => handleDragStart(g.id)}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs bg-background cursor-grab active:cursor-grabbing hover:bg-muted/50 select-none"
            >
              <GripVertical size={12} className="text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{g.name}</p>
                {g.plusOnes > 0 && <p className="text-muted-foreground">+{g.plusOnes}</p>}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Tables grid */}
      <div className="flex-1 overflow-y-auto">
        {/* Add table */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Nome da mesa (ex: Mesa 1)"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          />
          <input
            type="number"
            min={1}
            max={20}
            value={newTableCap}
            onChange={(e) => setNewTableCap(Number(e.target.value))}
            className="h-9 w-20 rounded-md border border-input bg-background px-3 text-sm"
            title="Capacidade"
          />
          <button
            onClick={handleCreate}
            disabled={isPending || !newTableName.trim()}
            className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => {
            const assigned = table.assignments.map((a) => guestMap[a.guestId]).filter(Boolean);
            const total = assigned.reduce((s, g) => s + 1 + g.plusOnes, 0);
            const isFull = total >= table.capacity;

            // S4b: cadeiras desta mesa (livre/ocupada/travada) + famílias que
            // escolheram no jogo (agrupadas pelo "chefe", claimedById).
            const tableSeats = seats.filter((s) => s.tableId === table.id);
            const seatByIndex = new Map(tableSeats.map((s) => [s.seatIndex, s]));
            const groups = new Map<string, { headName: string; count: number }>();
            for (const s of tableSeats) {
              if (!s.claimedById) continue;
              const g = groups.get(s.claimedById) ?? { headName: "", count: 0 };
              g.count++;
              if (s.guestId && s.guestId === s.claimedById) {
                g.headName = s.holderName ?? guestMap[s.guestId]?.name ?? "Convidado";
              }
              groups.set(s.claimedById, g);
            }
            const occupiedCount = tableSeats.filter((s) => s.guestId || s.companionId).length;

            return (
              <div
                key={table.id}
                className={`rounded-lg border bg-background overflow-hidden transition-colors ${
                  dragging && !isFull ? "border-primary ring-1 ring-primary/30" : "border-border"
                }`}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => handleDrop(table.id)}
              >
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-muted-foreground" />
                    <span className="text-sm font-medium">{table.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      isFull ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}>
                      {total}/{table.capacity}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(table.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Excluir mesa"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="p-2 flex flex-col gap-1 min-h-[80px]">
                  {assigned.map((g) => (
                    <div
                      key={g.id}
                      draggable
                      onDragStart={() => handleDragStart(g.id)}
                      className="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs cursor-grab active:cursor-grabbing hover:bg-muted/50 select-none"
                    >
                      <GripVertical size={10} className="text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{g.name}{g.plusOnes > 0 ? ` +${g.plusOnes}` : ""}</span>
                      <button
                        onClick={() => startTransition(async () => { void await unassignGuest(eventId, g.id); })}
                        className="text-muted-foreground hover:text-destructive"
                        title="Remover da mesa"
                      >×</button>
                    </div>
                  ))}

                  {!isFull && unassigned.length > 0 && (
                    <select
                      onChange={(e) => { handleDirectAssign(table.id, e.target.value); e.target.value = ""; }}
                      className="mt-1 h-7 w-full rounded border border-dashed border-border bg-transparent text-xs text-muted-foreground px-1"
                    >
                      <option value="">+ Adicionar convidado…</option>
                      {unassigned.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}{g.plusOnes > 0 ? ` (+${g.plusOnes})` : ""}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* S4b — Cadeiras escolhidas no jogo / travar lugares */}
                <div className="border-t px-2 py-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Armchair size={12} className="text-muted-foreground" />
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Lugares ({occupiedCount}/{table.capacity})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {Array.from({ length: table.capacity }, (_, i) => {
                      const s = seatByIndex.get(i);
                      const occupied = !!(s && (s.guestId || s.companionId));
                      const locked = !!(s && s.locked && !occupied);
                      const title = occupied
                        ? `${s!.holderName ?? "Convidado"} — cadeira ${i + 1}`
                        : locked
                          ? `Cadeira ${i + 1} travada — clique para destravar`
                          : `Cadeira ${i + 1} livre — clique para travar`;
                      const base = "flex h-6 min-w-6 items-center justify-center rounded px-1 text-[10px] font-medium border";
                      if (occupied) {
                        const child = s!.isChild;
                        return (
                          <span
                            key={i}
                            title={child ? `${s!.holderName ?? "Convidado"} (criança) — cadeira ${i + 1}` : title}
                            className={`${base} ${child ? "border-sky-300 bg-sky-100 text-sky-800" : "border-amber-300 bg-amber-100 text-amber-800"}`}
                          >
                            {(s!.holderName ?? "·").slice(0, 6)}{child ? "•" : ""}
                          </span>
                        );
                      }
                      return (
                        <button
                          key={i}
                          type="button"
                          title={title}
                          onClick={() => handleLock(table.id, i, !locked)}
                          className={`${base} ${
                            locked
                              ? "border-neutral-400 bg-neutral-200 text-neutral-600"
                              : "border-dashed border-border text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          {locked ? <Lock size={10} /> : <Unlock size={10} className="opacity-40" />}
                        </button>
                      );
                    })}
                  </div>
                  {groups.size > 0 && (
                    <div className="flex flex-col gap-1">
                      {Array.from(groups.entries()).map(([headId, g]) => {
                        const infants = infantsByGuest[headId] ?? 0;
                        return (
                        <div key={headId} className="flex items-center gap-1 text-[11px]">
                          <span className="truncate flex-1">
                            {g.headName || "Convidado"}{g.count > 1 ? ` (família: ${g.count})` : ""}
                            {infants > 0 ? ` +${infants} bebê${infants > 1 ? "s" : ""} de colo` : ""}
                          </span>
                          <select
                            defaultValue=""
                            onChange={(e) => { handleMove(headId, e.target.value); e.target.value = ""; }}
                            className="h-6 rounded border border-border bg-transparent text-[10px] px-1"
                            title="Mover a família para outra mesa"
                          >
                            <option value="">mover…</option>
                            {tables.filter((t) => t.id !== table.id).map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRelease(headId)}
                            className="text-muted-foreground hover:text-destructive"
                            title="Liberar os lugares desta família"
                          >×</button>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
