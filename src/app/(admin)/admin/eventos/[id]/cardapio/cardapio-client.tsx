"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { saveCardapio } from "./actions";

interface Props {
  eventId: string;
  isExample: boolean;
  foods: string[];
  drinks: string[];
  byoNotice: string;
  tableFoundMessage: string;
  exampleFoods: string[];
  exampleDrinks: string[];
}

export function CardapioClient(props: Props) {
  const [foods, setFoods] = useState(props.foods.join("\n"));
  const [drinks, setDrinks] = useState(props.drinks.join("\n"));
  const [byoNotice, setByoNotice] = useState(props.byoNotice);
  const [tableFoundMessage, setTableFoundMessage] = useState(props.tableFoundMessage);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", props.eventId);
      fd.set("foods", foods);
      fd.set("drinks", drinks);
      fd.set("byoNotice", byoNotice);
      fd.set("tableFoundMessage", tableFoundMessage);
      const result = await saveCardapio(fd);
      if (result.ok) toast.success("Cardápio salvo! O Garçom já mostra o seu.");
      else toast.error("Não foi possível salvar.");
    });
  }

  function fillExample() {
    setFoods(props.exampleFoods.join("\n"));
    setDrinks(props.exampleDrinks.join("\n"));
    if (!byoNotice.trim()) {
      setByoNotice("Quer trazer a sua própria bebida? Gim, vodka, tequila… está liberado!");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {props.isExample && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Você ainda não cadastrou o cardápio — o Garçom está mostrando um <strong>exemplo</strong>.
            Preencha abaixo com o cardápio real do seu casamento.{" "}
            <button type="button" onClick={fillExample} className="font-medium underline hover:no-underline">
              Começar a partir do exemplo
            </button>
          </span>
        </div>
      )}

      <Field
        label="Comidas"
        hint="Uma por linha (entradas, prato principal, doces, bolo…)."
        value={foods}
        onChange={setFoods}
        placeholder={"Canapés de entrada\nFilé ao molho madeira\nMesa de doces\nBolo dos noivos"}
        rows={6}
      />

      <Field
        label="Bebidas"
        hint="Uma por linha. O aviso abaixo aparece sempre no fim das bebidas."
        value={drinks}
        onChange={setDrinks}
        placeholder={"Espumante para o brinde\nVinho tinto e branco\nDrinks da casa\nSucos e refrigerantes"}
        rows={5}
      />

      <div>
        <label className="mb-1 block text-sm font-medium">Aviso ao fim das bebidas (opcional)</label>
        <input
          value={byoNotice}
          onChange={(e) => setByoNotice(e.target.value)}
          maxLength={300}
          placeholder="Ex.: pode trazer a sua própria bebida — gim, vodka, tequila…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="border-t border-border pt-5">
        <label className="mb-1 block text-sm font-medium">Recado ao achar a mesa (opcional)</label>
        <p className="mb-1.5 text-xs text-muted-foreground">
          Mensagem carinhosa que o convidado vê quando encontra o próprio lugar no salão. Em branco,
          usamos um agradecimento genérico.
        </p>
        <textarea
          value={tableFoundMessage}
          onChange={(e) => setTableFoundMessage(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Ex.: Que alegria ter você aqui! Este lugar é todo seu — aproveite cada momento com a gente."
          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {isPending ? "Salvando…" : "Salvar cardápio"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <p className="mb-1.5 text-xs text-muted-foreground">{hint}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}
