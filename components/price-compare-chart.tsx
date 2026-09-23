"use client";

import { Download } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PricePoint, SymbolCode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { downloadTextFile, toCsv } from "@/lib/utils";

/** Series colours cycle; the board never draws more issuers than the
 *  watchlist holds, and a repeated hue is still separated by its legend key. */
/** Greyscale series: the first issuer in black, the rest in stepped greys. Each
 *  line is also named at its end, so no reader has to match a shade to a key. */
const SERIES_COLORS = ["var(--foreground)", "var(--muted-foreground)", "var(--subtle-foreground)", "var(--border-strong)", "var(--muted-foreground)", "var(--subtle-foreground)"];

/**
 * Several issuers over one recorded window.
 *
 * Every line is rebased to 100 on its own first session, which is the only way
 * two issuers at different price levels can be read on one axis. Volume and
 * the event markers stay on the single-issuer chart: a volume bar belongs to
 * one issuer, and an event line drawn across six of them would claim a reach
 * the recording does not give it.
 */
export function PriceCompareChart({ series, ihsgFrom }: {
  series: Array<{ symbol: SymbolCode; data: PricePoint[] }>;
  ihsgFrom: PricePoint[];
}) {
  const dates = ihsgFrom.map((point) => point.date);
  const baseIhsg = ihsgFrom[0].ihsg;
  const closeByDate = series.map(({ symbol, data }) => ({
    symbol,
    base: data[0]?.close,
    byDate: new Map(data.map((point) => [point.date, point.close] as const)),
  }));
  const rows = dates.map((date, index) => {
    const row: Record<string, string | number | null> = { date, shortDate: date.slice(5), ihsgClose: ihsgFrom[index].ihsg, IHSG: Number((ihsgFrom[index].ihsg / baseIhsg * 100).toFixed(2)) };
    for (const { symbol, base, byDate } of closeByDate) {
      const close = byDate.get(date);
      row[`${symbol} tutup`] = close ?? null;
      row[symbol] = close !== undefined && base ? Number((close / base * 100).toFixed(2)) : null;
    }
    return row;
  });

  const columns = ["Tanggal", "IHSG", ...series.map((item) => item.symbol)];
  const exportCsv = () => {
    // The file carries the recorded close beside the rebased index: the index
    // is what the chart plots, the close is what the recording holds.
    const csvRows = [
      ["Tanggal", "IHSG", "IHSG (indeks)", ...series.flatMap((item) => [item.symbol, `${item.symbol} (indeks)`])],
      ...rows.map((row) => [
        String(row.date),
        String(row.ihsgClose),
        String(row.IHSG),
        ...series.flatMap((item) => [row[`${item.symbol} tutup`] === null ? "" : String(row[`${item.symbol} tutup`]), row[item.symbol] === null ? "" : String(row[item.symbol])]),
      ]),
    ];
    downloadTextFile(`${series.map((item) => item.symbol).join("-")}-${dates[0]}-${dates[dates.length - 1]}.csv`, toCsv(csvRows), "text/csv");
  };

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="editorial text-base">Pergerakan saham</h2>
          <p className="mt-0.5 text-xs text-subtle-foreground">{dates.length} sesi · {series.length} emiten dibanding IHSG · indeks 100 pada sesi pertama</p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportCsv}><Download aria-hidden="true" className="size-3.5" />Unduh CSV</Button>
      </div>
      <div className="p-3">
        <div role="img" style={{ height: 340 }} className="w-full" aria-label={`Grafik indeks ${series.map((item) => item.symbol).join(", ")} dibanding IHSG`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 20, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="shortDate" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={34} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12 }} formatter={(value, name) => [`${Number(value).toFixed(2)} indeks`, name]} labelFormatter={(value) => `Tanggal ${value}`} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-mono)" }} />
              <Line type="monotone" dataKey="IHSG" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} animationDuration={900} />
              {series.map((item, index) => <Line key={item.symbol} type="monotone" dataKey={item.symbol} stroke={SERIES_COLORS[index % SERIES_COLORS.length]} strokeWidth={index === 0 ? 2.25 : 1.5} dot={false} activeDot={{ r: 4 }} connectNulls animationDuration={900} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="border-t border-border px-4 py-3">
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Indeks {series.map((item) => item.symbol).join(", ")} dan IHSG, 100 pada sesi pertama</caption>
            <thead className="sticky top-0 bg-surface text-muted-foreground"><tr>{columns.map((column, index) => <th key={column} className={`px-2 py-2${index ? " text-right" : ""}`}>{column}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={String(row.date)} className="border-t border-border"><td className="px-2 py-2 font-mono">{row.date}</td><td className="px-2 py-2 text-right font-mono">{row.IHSG}</td>{series.map((item) => <td key={item.symbol} className="px-2 py-2 text-right font-mono">{row[item.symbol] ?? "—"}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}