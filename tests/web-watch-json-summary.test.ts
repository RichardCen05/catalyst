import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { summarizeJsonPayload } from "@/lib/web-watch/json-summary";
import { buildCandidate } from "@/lib/web-watch/check";
import type { WatchedSourceState } from "@/lib/web-watch/types";
import type { SourceText } from "@/lib/web-watch/fetching";

/** The payloads below are the exact bodies two production candidates carried
 *  in the web-watch queue on 2026-09-16. A reviewer looking at either of them
 *  in /pantau saw a slice of raw JSON as the title. */
const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");
const QUAKE = fixture("bmkg-quake.json");
const FORECAST = fixture("bmkg-forecast.json");

describe("summarizeJsonPayload", () => {
  it("reads a BMKG quake payload into a sentence a reviewer can act on", () => {
    const result = summarizeJsonPayload(QUAKE);

    expect(result).not.toBeNull();
    // Every value is read from the payload; none is computed or guessed.
    expect(result?.title).toBe("Gempa M2.6, kedalaman 6 km — Pusat gempa berada di darat 28 km selatan Kab. Bandung");
    expect(result?.summary).toContain("16 Sep 2026 17:14:19 WIB");
    expect(result?.summary).toContain("Magnitudo 2.6, kedalaman 6 km");
    expect(result?.summary).toContain("Dirasakan III Pangalengan");
  });

  it("reads a BMKG village forecast into place plus the next few steps", () => {
    const result = summarizeJsonPayload(FORECAST);

    expect(result).not.toBeNull();
    expect(result?.title).toBe("Prakiraan cuaca Pomalaa, Pomalaa, Kolaka (Sulawesi Tenggara)");
    expect(result?.summary).toContain("2026-09-17 01:00:00 Cerah");
    expect(result?.summary).toContain("hujan 0 mm");
    expect(result?.summary).toContain("angin 13.8 km/jam NE");
  });

  it("returns null for a JSON shape it does not recognise", () => {
    expect(summarizeJsonPayload('{"harga":{"emas":1900}}')).toBeNull();
    expect(summarizeJsonPayload('{"Infogempa":{"gempa":{"Tanggal":"16 Sep 2026"}}}')).toBeNull();
    expect(summarizeJsonPayload('{"lokasi":{"desa":"Pomalaa"},"data":[]}')).toBeNull();
  });

  it("returns null instead of throwing on text that is not JSON at all", () => {
    expect(summarizeJsonPayload("Kalbe (KLBF) Rencana Buyback Saham")).toBeNull();
    expect(summarizeJsonPayload("")).toBeNull();
    // A payload cut off mid-object must be a null, never an exception: a
    // summariser has no business breaking a sweep.
    expect(summarizeJsonPayload(QUAKE.slice(0, 120))).toBeNull();
    expect(summarizeJsonPayload("{")).toBeNull();
  });
});

describe("buildCandidate with a JSON document", () => {
  const state = {
    id: "bmkg-forecast-pomalaa",
    label: "BMKG — prakiraan Pomalaa (ANTM)",
    category: "weather",
    sourceType: "macro",
  } as unknown as WatchedSourceState;
  const textOf = (raw: string): SourceText => ({ text: raw } as SourceText);

  it("gives the candidate a readable title and keeps the raw payload in body", () => {
    const candidate = buildCandidate(state, textOf(FORECAST), "https://api.bmkg.go.id/publik/prakiraan-cuaca", null, null, "", "2026-09-17T00:00:00.000Z");

    expect(candidate.title).toBe("Prakiraan cuaca Pomalaa, Pomalaa, Kolaka (Sulawesi Tenggara)");
    expect(candidate.summary).toContain("Cerah");
    // The citation and the audit trail must still reach the raw document.
    expect(candidate.body?.startsWith('{"lokasi"')).toBe(true);
    expect(JSON.parse(candidate.body ?? "{}").lokasi.desa).toBe("Pomalaa");
  });

  it("keeps a feed-supplied title, because a human wrote it", () => {
    const candidate = buildCandidate(state, textOf(FORECAST), "https://api.bmkg.go.id/publik/prakiraan-cuaca", "Prakiraan resmi BMKG", null, "", "2026-09-17T00:00:00.000Z");

    expect(candidate.title).toBe("Prakiraan resmi BMKG");
  });

  it("falls back to the first line for an unrecognised payload", () => {
    const candidate = buildCandidate(state, textOf('{"harga":{"emas":1900}}'), "https://example.test/x.json", null, null, "", "2026-09-17T00:00:00.000Z");

    expect(candidate.title).toBe('{"harga":{"emas":1900}}');
  });
});
