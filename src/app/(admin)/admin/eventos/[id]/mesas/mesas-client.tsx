"use client";

import { useState, useTransition } from "react";
import { createTable, deleteTable, assignGuest, unassignGuest, updateTableName } from "./actions";
import { Users, Plus, Trash2, GripVertical } from "lucide-react";

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

interface Props {
  eventId: string;
  tables: Table[];
  guests: Guest[];
  guestMap: Record<string, Guest>;
}

export function MesasClient({ eventId, tables: initialTables, guests, guestMap }: Props) {
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
