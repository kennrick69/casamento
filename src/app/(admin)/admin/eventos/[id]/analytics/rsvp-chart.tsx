"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  confirmed: number;
  declined: number;
}

export function RsvpChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          labelFormatter={(label) => `Data: ${label}`}
          formatter={(value, name) => [value, name === "confirmed" ? "Confirmados" : "Recusados"]}
        />
        <Legend formatter={(value) => (value === "confirmed" ? "Confirmados" : "Recusados")} />
        <Bar dataKey="confirmed" fill="#22c55e" radius={[3, 3, 0, 0]} />
        <Bar dataKey="declined" fill="#f87171" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
