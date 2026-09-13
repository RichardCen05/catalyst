"use client";

import type { SourceSpan } from "@/lib/types";

/**
 * The source body, in its own words, with the cited passage marked in it.
 * Ported pattern from ReguLens's SourceText — a citation is only worth
 * anything if the reader can trust where it points, so a `not_found` span
 * is reported as-is rather than pointed at the nearest paragraph.
 */
type Piece = { text: string; cited: boolean };

function split(text: string, span: SourceSpan | undefined): Piece[] {
  if (!span || span.match === "not_found" || span.end <= span.start) return [{ text, cited: false }];
  const pieces: Piece[] = [];
  if (span.start > 0) pieces.push({ text: text.slice(0, span.start), cited: false });
  pieces.push({ text: text.slice(span.start, span.end), cited: true });
  if (span.end < text.length) pieces.push({ text: text.slice(span.end), cited: false });
  return pieces;
}

export function SourceText({ body, span }: { body: string | null; span?: SourceSpan }) {
  if (!body) {
    return <p className="text-xs leading-5 text-muted-foreground">Rekaman ini tidak menyimpan teks sumber lengkap.</p>;
  }
  const pieces = split(body, span);
  return (
    <div>
      <p className="text-xs leading-5 text-muted-foreground">
        {span?.match === "exact"
          ? "Kalimat yang mendasari klaim ini disorot di bawah."
          : span?.match === "approximate"
            ? "Kecocokan terdekat disorot; redaksi rekaman berbeda sedikit dari ringkasan."
            : "Kalimat sumber tidak ditemukan pada teks rekaman. Kami tidak menyorot paragraf yang salah."}
      </p>
      <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border bg-background p-3">
        <p className="whitespace-pre-wrap text-xs leading-6 text-foreground">
          {pieces.map((piece, index) =>
            piece.cited ? (
              <mark key={index} className="rounded bg-primary/20 px-0.5 text-foreground">
                {piece.text}
              </mark>
            ) : (
              <span key={index}>{piece.text}</span>
            ),
          )}
        </p>
      </div>
    </div>
  );
}
