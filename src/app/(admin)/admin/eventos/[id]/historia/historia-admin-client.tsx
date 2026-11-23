"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { addStoryItem, deleteStoryItem } from "./actions";

interface StoryPhotoView {
  url: string;
  caption: string | null;
}
interface StoryItem {
  id: string;
  title: string | null;
  description: string | null;
  dateLabel: string | null;
  date: string | null;
  photos: StoryPhotoView[];
}

interface DraftPhoto {
  id: string;
  file: File;
  url: string;
  caption: string;
}

const MAX_PHOTOS = 10;

export function HistoriaAdminClient({ items: initial, eventId }: { items: StoryItem[]; eventId: string }) {
  const [items] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: DraftPhoto[] = [];
    for (const file of Array.from(list)) {
      if (!file.type.startsWith("image/")) continue;
      next.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file), caption: "" });
    }
    setPhotos((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p) URL.revokeObjectURL(p.url);
      return prev.filter((x) => x.id !== id);
    });
  }

  function setCaption(id: string, caption: string) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)));
  }

  function resetForm() {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setShowForm(false);
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData();
    fd.append("eventId", eventId);
    fd.append("title", (form.elements.namedItem("title") as HTMLInputElement)?.value ?? "");
    fd.append("dateLabel", (form.elements.namedItem("dateLabel") as HTMLInputElement)?.value ?? "");
    fd.append("date", (form.elements.namedItem("date") as HTMLInputElement)?.value ?? "");
    fd.append("description", (form.elements.namedItem("description") as HTMLTextAreaElement)?.value ?? "");
    // Arrays paralelos: cada foto + sua legenda, na ordem.
    for (const p of photos) {
      fd.append("photo", p.file);
      fd.append("caption", p.caption);
    }

    startTransition(async () => {
      const result = await addStoryItem(fd);
      if (result.ok) {
        toast.success("Momento adicionado!");
        resetForm();
        window.location.reload();
      }
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Remover esta memória e suas fotos? Ação irreversível.")) return;
    startTransition(async () => {
      await deleteStoryItem(id, eventId);
      toast.success("Momento removido");
      window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {items.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground py-4">Nenhum momento adicionado ainda.</p>
      )}

      {items.map((item) => (
        <div key={item.id} className="flex gap-3 border rounded-lg p-4">
          {item.photos[0] && (
            <div className="relative w-20 h-20 shrink-0 rounded overflow-hidden">
              <Image src={item.photos[0].url} alt={item.title ?? "Memória"} fill className="object-cover" sizes="80px" />
              {item.photos.length > 1 && (
                <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-tl">
                  +{item.photos.length - 1}
                </span>
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {(item.dateLabel ?? item.date) && (
              <p className="text-xs text-muted-foreground mb-0.5">
                {item.dateLabel ?? (item.date ? new Date(item.date).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "")}
              </p>
            )}
            <p className="font-medium text-sm">{item.title ?? <span className="text-muted-foreground italic">Memória só de fotos</span>}</p>
            {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
            {item.photos.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {item.photos.length} foto{item.photos.length !== 1 ? "s" : ""}
                {item.photos.some((p) => p.caption) ? " · com legendas" : ""}
              </p>
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

      {showForm ? (
        <form onSubmit={handleAdd} className="border rounded-lg p-4 flex flex-col gap-4">
          <h3 className="font-semibold text-sm">Novo momento</h3>
          <p className="text-xs text-muted-foreground -mt-2">
            No Bosque, cada memória vira um totem. Deixe o texto em branco e adicione só fotos para
            uma memória de imagens — o convidado passa de uma para a outra.
          </p>

          <div className="flex flex-col gap-1">
            <Label htmlFor="title">Título (opcional)</Label>
            <Input id="title" name="title" placeholder="Primeiro encontro" className="h-11" />
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
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea id="description" name="description" rows={3} placeholder="Como foi esse momento especial…" className="resize-none" />
          </div>

          {/* Fotos com legenda por foto */}
          <div className="flex flex-col gap-2">
            <Label>Fotos ({photos.length}/{MAX_PHOTOS}) — legenda por foto</Label>
            {photos.map((p, i) => (
              <div key={p.id} className="flex gap-3 items-start border rounded-lg p-2">
                <div className="relative w-16 h-16 shrink-0 rounded overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    value={p.caption}
                    onChange={(e) => setCaption(p.id, e.target.value)}
                    maxLength={200}
                    placeholder={`Legenda da foto ${i + 1} (opcional)`}
                    className="h-10"
                  />
                </div>
                <button type="button" onClick={() => removePhoto(p.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Remover foto">
                  <X size={16} />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="h-11 gap-2">
                <ImagePlus size={16} /> Adicionar foto{photos.length > 0 ? "s" : ""}
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? <><Loader2 size={16} className="animate-spin mr-2" /> Salvando…</> : "Adicionar momento"}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full h-11 gap-2">
          <Plus size={16} /> Adicionar momento
        </Button>
      )}
    </div>
  );
}
