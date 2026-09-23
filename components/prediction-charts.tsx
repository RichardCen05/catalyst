"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Lebar gutter label mengikuti lebar layar: 180px yang lapang di desktop
 * memakan dua pertiga layar ponsel dan menyisakan batang sepanjang jempol.
 * Nilai awalnya `false` supaya render di server dan render pertama di klien
 * menghasilkan pohon yang sama.
 */
function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return narrow;
}

/**
 * Grafik untuk Lapis 3 — dan hanya untuk angka yang sudah dihitung.
 *
 * Komponen ini tidak menghitung apa pun: ia menerima deret yang sudah
 * diturunkan dari `CalibrationReport` di komponen induk dan menggambarnya.
 * Sebuah grafik yang menghitung ulang angkanya sendiri adalah angka kedua yang
 * bisa berselisih dengan tabel di bawahnya.
 *
 * Bucket tanpa cukup bukti tidak pernah masuk ke sini. Batang sepanjang 33%
 * dari tiga kejadian terbaca sama meyakinkannya dengan 33% dari dua puluh —
 * itulah persis kekeliruan yang MIN_SAMPLE ada untuk mencegah.
 */

const TOOLTIP_STYLE = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
} as const;

export interface VerdictDatum {
  label: string;
  value: number;
  tone: "positive" | "attention" | "danger" | "muted";
}

const TONE_FILL: Record<VerdictDatum["tone"], string> = {
  positive: "var(--foreground)",
  attention: "var(--muted-foreground)",
  danger: "var(--border-strong)",
  muted: "var(--border)",
};

/** Sebaran vonis: berapa klaim yang tepat, meleset, atau benar tapi salah waktu. */
export function VerdictChart({ data }: { data: VerdictDatum[] }) {
  return (
    <div className="h-56 w-full px-2 pb-2" aria-label="Grafik sebaran vonis klaim">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, right: 8, left: 8, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval={0}
          />
          <YAxis hide domain={[0, "dataMax"]} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [`${value} klaim`, "Jumlah"]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={900}>
            <LabelList dataKey="value" position="top" fill="var(--muted-foreground)" fontSize={12} />
            {data.map((entry) => <Cell key={entry.label} fill={TONE_FILL[entry.tone]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface CalibrationDatum {
  label: string;
  dimension: string;
  hitRate: number;
  occurrenceRate: number;
  n: number;
}

/**
 * Dua batang per kelompok: seberapa sering tepat waktu, dan seberapa sering
 * kondisinya terjadi sama sekali. Jarak antara keduanya adalah klaim yang
 * benar arah tetapi salah waktu — satu-satunya alasan grafik ini berpasangan
 * dan bukan satu batang.
 */
export function CalibrationChart({ data }: { data: CalibrationDatum[] }) {
  const narrow = useNarrowViewport();
  return (
    <div style={{ height: data.length * 56 + 56 }} className="w-full px-2 pb-2" aria-label="Grafik ketepatan per kelompok">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 44, left: 8, bottom: 0 }} barGap={4}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={narrow ? 104 : 168}
            tick={{ fill: "var(--muted-foreground)", fontSize: narrow ? 10 : 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name) => [`${value}%`, name]}
            labelFormatter={(label) => {
              const row = data.find((entry) => entry.label === label);
              return row ? `${row.dimension} · ${row.label} · ${row.n} tervonis` : label;
            }}
          />
          <Bar dataKey="hitRate" name="Tepat waktu" fill="var(--positive)" radius={[0, 4, 4, 0]} animationDuration={900}>
            <LabelList dataKey="hitRate" position="right" formatter={(value) => `${value}%`} fill="var(--muted-foreground)" fontSize={12} />
          </Bar>
          <Bar dataKey="occurrenceRate" name="Terjadi, kapan pun" fill="var(--primary)" fillOpacity={0.45} radius={[0, 4, 4, 0]} animationDuration={900}>
            <LabelList dataKey="occurrenceRate" position="right" formatter={(value) => `${value}%`} fill="var(--muted-foreground)" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
