"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateEventTheme, saveEventThemeDraft } from "./actions";
import { isRedirectError } from "@/lib/utils/redirect";
import { Button } from "@/components/ui/button";
import { THEMES } from "@/lib/themes";

type DraftStatus = "idle" | "saving" | "saved";

interface ThemeOption {
  id: string;
  key: string;
  name: string;
}

interface Props {
  eventId: string;
  currentThemeKey: string;
  themes: ThemeOption[];
  isWizard?: boolean;
}

export function WizardThemeForm({ eventId, currentThemeKey, themes, isWizard = false }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(currentThemeKey);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("idle");

  async function autoSaveTheme(themeKey: string) {
    setDraftStatus("saving");
    try {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("themeKey", themeKey);
      await saveEventThemeDraft(fd);
      setDraftStatus("saved");
      setTimeout(() => setDraftStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setDraftStatus("idle");
    }
  }

  function handleChange(themeKey: string) {
    setSelected(themeKey);
    autoSaveTheme(themeKey);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("themeKey", selected);
      try {
        await updateEventTheme(fd);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        toast.error("Algo deu errado. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {themes.map((theme) => {
          const themeData = THEMES.find((t) => t.key === theme.key);
          const color = themeData?.tokens.colors.primary ?? "#1A1A1A";
          return (
            <label
              key={theme.id}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selected === theme.key
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <input
                type="radio"
                name="themeKey"
                value={theme.key}
                checked={selected === theme.key}
                onChange={() => handleChange(theme.key)}
                className="sr-only"
              />
              <div className="w-10 h-10 rounded-full" style={{ background: color }} />
              <span className="text-xs text-center leading-tight">{theme.name}</span>
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        {draftStatus !== "idle" ? (
          <span className="text-xs text-muted-foreground">
            {draftStatus === "saving" ? "Salvando…" : "✓ Salvo"}
          </span>
        ) : (
          <span />
        )}
        <Button type="submit" className="h-11" disabled={isPending}>
          {isPending ? "Salvando…" : isWizard ? "Próximo: Publicar →" : "Salvar tema →"}
        </Button>
      </div>
    </form>
  );
}
