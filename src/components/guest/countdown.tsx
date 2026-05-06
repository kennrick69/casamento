"use client";

import { useEffect, useState } from "react";
import { differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";

interface CountdownProps {
  targetDate: Date;
  timezone: string; // usado só pra exibição do label de fuso
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  passed: boolean;
}

function calculate(target: Date): TimeLeft {
  const now = new Date();
  if (now >= target) return { days: 0, hours: 0, minutes: 0, passed: true };

  const days = differenceInDays(target, now);
  const hours = differenceInHours(target, now) % 24;
  const minutes = differenceInMinutes(target, now) % 60;
  return { days, hours, minutes, passed: false };
}

export function Countdown({ targetDate, timezone }: CountdownProps) {
  const [time, setTime] = useState<TimeLeft>(() => calculate(targetDate));

  // Atualiza a cada minuto — sem segundos por decisão de produto
  useEffect(() => {
    const id = setInterval(() => setTime(calculate(targetDate)), 60_000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (time.passed) {
    return (
      <p className="text-[var(--theme-secondary)] text-sm">
        O grande dia chegou! 🎉
      </p>
    );
  }

  const tzLabel: Record<string, string> = {
    "America/Sao_Paulo": "Brasília",
    "America/Manaus": "Manaus",
    "America/Fortaleza": "Fortaleza",
  };

  return (
    <div className="text-center">
      <div className="flex items-end justify-center gap-3">
        <Unit value={time.days} label="dias" />
        <Separator />
        <Unit value={time.hours} label="horas" />
        <Separator />
        <Unit value={time.minutes} label="min" />
      </div>
      <p className="mt-2 text-xs text-[var(--theme-secondary)]">
        horário de {tzLabel[timezone] ?? timezone}
      </p>
    </div>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[3.5rem]">
      <span
        className="text-4xl font-bold tabular-nums leading-none"
        style={{ fontFamily: "var(--theme-font-heading)" }}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-xs mt-1 text-[var(--theme-secondary)] uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function Separator() {
  return (
    <span className="text-3xl font-light text-[var(--theme-secondary)] pb-5">
      :
    </span>
  );
}
