"use client";

import { useState } from "react";
import { Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { archiveEvent } from "./actions";

// Zona de perigo nas Configurações: "excluir" = arquivar (soft delete). Exige
// digitar o nome do casal para habilitar o botão. Bloqueado no evento piloto.
export function DangerZone({
  eventId,
  coupleNames,
  isPrimary,
}: {
  eventId: string;
  coupleNames: string;
  isPrimary: boolean;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === coupleNames.trim().toLowerCase();

  return (
    <div className="mt-8 rounded-lg border border-red-300 bg-red-50 p-5">
      <h2 className="text-base font-semibold text-red-800 flex items-center gap-2 mb-1">
        <Trash2 className="size-4" aria-hidden />
        Zona de perigo
      </h2>

      {isPrimary ? (
        <p className="text-sm text-red-800/80 flex items-start gap-2">
          <Lock className="size-4 mt-0.5 shrink-0" aria-hidden />
          Este é o evento principal (o que o PRESS START abre) e não pode ser
          excluído.
        </p>
      ) : (
        <>
          <p className="text-sm text-red-800/80 mb-4">
            Excluir move o evento para os arquivados (some da lista). Nada é
            apagado do banco e você pode recuperá-lo depois. Para confirmar,
            digite o nome do evento: <strong>{coupleNames}</strong>
          </p>
          <form action={archiveEvent} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input type="hidden" name="eventId" value={eventId} />
            <Input
              name="confirmName"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={coupleNames}
              autoComplete="off"
              className="sm:max-w-xs"
              aria-label="Digite o nome do evento para confirmar"
            />
            <Button
              type="submit"
              variant="destructive"
              disabled={!matches}
              className="h-10"
            >
              Excluir evento
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
