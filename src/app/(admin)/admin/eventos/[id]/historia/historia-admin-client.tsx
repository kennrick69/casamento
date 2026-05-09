"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { addStoryItem, deleteStoryItem } from "./actions";

interface StoryItem {
  id: string;
  title: string;
  description: string | null;
  dateLabel: string | null;
  date: string | null;
  photoUrl: string | null;
}

export function HistoriaAdminClient({ items: initial, eventId }: { items: StoryItem[]; eventId: string }) {
  const [items, setItems] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.append("eventId", eventId);

    startTransition(async () => {
      const result = await addStoryItem(fd);
      if (result.ok) {
        toast.success("Momento adicionado!");
        form.reset();
        setShowForm(false);
        // Reload items via server action revalidation — navigate to refresh
        window.location.reload();
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteStoryItem(id, eventId);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Momento removido");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* List */}
      {items.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground py-4">
          Nenhum momento adicionado ainda.
        </p>
      )}

      {items.map((item) => (
        <div key={item.id} className="flex gap-3 border rounded-lg p-4">
          {item.photoUrl && (
            <div className="relative w-20 h-20 shrink-0 rounded overflow-hidden">
              <Image src={item.photoUrl} alt={item.title} fill className="object-cover" sizes="80px" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {(item.dateLabel ?? item.date) && (
              <p className="text-xs text-muted-foreground mb-0.5">
                {item.dateLabel ?? (item.date ? new Date(item.date).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "")}
              </p>
            )}
            <p className="font-medium text-sm">{item.title}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
            )}
          </div>
          <button
            onClick={() => handleDelete(item.id)}
            disabled={isPending}
            className="text-muted-foreground hover:text-destructive shrink-0 p-1"
            aria-label="Remover"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      {/* Add form */}
      {showForm ? (
        <form onSubmit={handleAdd} className="border rounded-lg p-4 flex flex-col gap-4">
          <h3 className="font-semibold text-sm">Novo momento</h3>

          <div className="flex flex-col gap-1">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" name="title" required placeholder="Primeiro encontro" className="h-11" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="dateLabel">Data (texto)</Label>
              <Input id="dateLabel" name="dateLabel" placeholder="Verão de 2019" className="h-11" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="date">Data exata</Label>
              <Input id="date" name="date" type="date" className="h-11" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" rows={3} placeholder="Como foi esse momento especial…" className="resize-none" />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="photo">Foto (opcional)</Label>
            <Input id="photo" name="photo" type="file" accept="image/*" className="h-11" />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? <><Loader2 size={16} className="animate-spin mr-2" /> Salvando…</> : "Adicionar momento"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full h-11 gap-2">
          <Plus size={16} />
          Adicionar momento
        </Button>
      )}
    </div>
  );
}
