import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

/**
 * A fixed-precision figure in id-ID.
 *
 * An index read out of a chart tooltip has to look like the id-ID figures in
 * the table beside it; `toFixed` there printed `105.23 indeks` next to
 * `5.200` — two separators on one screen.
 */
export function formatDecimal(value: number, digits = 2) {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export function formatCurrency(value: number) {
  // id-ID separates the symbol with a non-breaking space, which reads as a
  // double gap once the number is set in a tabular mono face.
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
    .format(value)
    .replace(/\u00a0/g, " ");
}

/**
 * A recorded figure as the reader sees it: id-ID decimals and a true minus.
 *
 * Display only. The engine's strings stay as they are, because the verifier
 * and the figure matcher read them; `canonicalFigure` strips both separators,
 * so a reader who types the figure off the screen still reaches it.
 */
export function displayFigure(value: string): string {
  if (/\d,\d{3}/.test(value)) return value.replace(/^-/, "−");
  return value.replace(/^-/, "−").replace(/(\d)\.(\d)/g, "$1,$2");
}

/**
 * Engine prose as the reader sees it: a hyphen standing for a minus before a
 * number becomes the true minus, so "-1,7%" never sits beside "−1,2%" (QA P3-1).
 * Only a hyphen at the start of a word counts; a date (`2025-12-01`), a range
 * (`24-26`) or a compound (`Non-USD`) keeps its hyphen. Display only, like
 * `displayFigure`: the engine's strings stay ASCII for the verifier.
 */
export function displayText(text: string): string {
  return text.replace(/(^|[\s(\[])-(?=\d)/g, "$1\u2212");
}

/**
 * A signed percentage in the display figure's own style.
 *
 * `−0,0%` claims a fall the recording did not have — the move simply rounded
 * away — so a magnitude indistinguishable from zero prints unsigned. The minus
 * is typographic because a reader reads this string; the verifier matches on
 * the engine's ASCII figures (`displayFigure`).
 */
export function signedPercent(value: number, digits = 1): string {
  const magnitude = formatDecimal(Math.abs(value), digits);
  if (magnitude === formatDecimal(0, digits)) return `${magnitude}%`;
  return `${value < 0 ? "\u2212" : "+"}${magnitude}%`;
}

/**
 * A full stop, only where one is missing.
 *
 * A recorded headline is written by its source and may already be a sentence,
 * so appending a stop to it prints `..`. Wherever copy is joined to copy, the
 * join goes through here instead of typing its own punctuation.
 */
export function withStop(text: string): string {
  const trimmed = text.trimEnd();
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function formatAsOf(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

/** A stored UTC instant as a Jakarta reader reads it, zone named. A bare
 *  "08:10" sliced from the ISO string read as morning in Jakarta while it was
 *  15:10 there. */
export function formatWib(value: string) {
  return `${formatAsOf(value)} WIB`;
}

/**
 * RFC 4180 rows. Quoting is unconditional so a value that later grows a comma,
 * a quote, or a newline cannot silently split a column in the reader's
 * spreadsheet.
 */
export function toCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

/** Hand a generated file to the reader without leaving the page. */
export function downloadTextFile(filename: string, text: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${mimeType};charset=utf-8` }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
