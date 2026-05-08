"use client";

import { getPasswordScore } from "@/lib/auth/validate-password";

const COLORS = ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-600"];
const LABELS = ["Muito fraca", "Fraca", "Razoável", "Boa", "Excelente"];

export function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const score = getPasswordScore(password);
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? COLORS[score] : "bg-border"}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{LABELS[score]}</p>
    </div>
  );
}
