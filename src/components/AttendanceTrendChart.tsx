"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export type MonthlyAttendancePoint = { month: string; rate: number | null };

export default function AttendanceTrendChart({ data }: { data: MonthlyAttendancePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
        <Tooltip formatter={(v: unknown) => (v === null ? "No records" : `${v}%`)} />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="#1b5e20"
          strokeWidth={2}
          dot={{ r: 3, fill: "#1b5e20" }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
