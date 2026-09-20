import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatCurrency(value: number) {
  // id-ID separates the symbol with a non-breaking space, which reads as a
  // double gap once the number is set in a tabular mono face.
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
    .format(value)
    .replace(/\u00a0/g, " ");
}

export function formatAsOf(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  }).format(new Date(value));
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
