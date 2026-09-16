/**
 * Human titles for the JSON endpoints in the watch list.
 *
 * Some watched sources answer with an API payload rather than a page, and the
 * generic headline rule — first line of the extracted text — turned those
 * into a slice of raw JSON:
 *
 *   {"Infogempa":{"gempa":{"Tanggal":"16 Sep 2026","Jam":"08:11:31 WIB",...
 *
 * A reviewer cannot decide an exposure from that, so they were deciding from
 * the URL instead. Five mine-site BMKG forecast sources were added on
 * 2026-09-17 (Sungailiat, Tanjung-Tabalong, Tanjung Enim, Pomalaa, Sorowako),
 * so this hits the weather leg on every sweep.
 *
 * Two rules hold this file honest:
 *
 * **Only shapes we recognise.** An unknown payload returns null and the
 * caller keeps its previous behaviour. Nothing here guesses at a field name,
 * and a malformed document is a null, never a throw — a summariser must not
 * be able to break a sweep.
 *
 * **Nothing is invented.** Every number and place name in the output is read
 * straight from the payload. The raw text stays in `body`, so the citation
 * and the audit trail lose nothing.
 */

export interface JsonSummary {
  title: string;
  summary: string;
}

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * BMKG earthquake payload: `{ Infogempa: { gempa: { ... } } }`.
 * Magnitude, depth, region, felt-at and time, in that order of usefulness to
 * a reviewer deciding whether a mine or plant site is anywhere near it.
 */
function summarizeQuake(payload: Record<string, unknown>): JsonSummary | null {
  const info = payload.Infogempa;
  if (!isRecord(info)) return null;
  const quake = info.gempa;
  if (!isRecord(quake)) return null;

  const magnitude = asString(quake.Magnitude);
  const depth = asString(quake.Kedalaman);
  const region = asString(quake.Wilayah);
  const feltAt = asString(quake.Dirasakan);
  const date = asString(quake.Tanggal);
  const time = asString(quake.Jam);
  const potential = asString(quake.Potensi);
  // Without a magnitude this is not a quake record we recognise.
  if (!magnitude) return null;

  const titleParts = [`Gempa M${magnitude}`];
  if (depth) titleParts.push(`kedalaman ${depth}`);
  const head = titleParts.join(", ");
  const title = region ? `${head} — ${region}` : head;

  const summaryParts: string[] = [];
  if (date || time) summaryParts.push([date, time].filter(Boolean).join(" "));
  summaryParts.push(`Magnitudo ${magnitude}${depth ? `, kedalaman ${depth}` : ""}`);
  if (region) summaryParts.push(region);
  if (feltAt) summaryParts.push(`Dirasakan ${feltAt}`);
  if (potential) summaryParts.push(potential);
  return { title, summary: `${summaryParts.join(". ")}.` };
}

/** One forecast step, reduced to what a reviewer reads. */
function describeStep(step: Record<string, unknown>): string | null {
  const when = asString(step.local_datetime) ?? asString(step.datetime);
  const description = asString(step.weather_desc);
  if (!when && !description) return null;
  const rain = asNumber(step.tp);
  const wind = asNumber(step.ws);
  const direction = asString(step.wd);
  const parts: string[] = [];
  if (description) parts.push(description);
  if (rain !== null) parts.push(`hujan ${rain} mm`);
  if (wind !== null) parts.push(`angin ${wind} km/jam${direction ? ` ${direction}` : ""}`);
  const body = parts.join(", ");
  return when ? `${when} ${body}`.trim() : body;
}

/**
 * BMKG per-village forecast payload: `{ lokasi: {...}, data: [{ cuaca: [[...]] }] }`.
 * `cuaca` is an array of arrays — one inner array per forecast day — so the
 * steps are flattened before the first few are read.
 */
function summarizeForecast(payload: Record<string, unknown>): JsonSummary | null {
  const place = payload.lokasi;
  if (!isRecord(place)) return null;
  const rows = payload.data;
  if (!Array.isArray(rows)) return null;

  const village = asString(place.desa);
  const district = asString(place.kecamatan);
  const regency = asString(place.kotkab);
  const province = asString(place.provinsi);
  if (!village && !district) return null;

  const where = [village, district, regency].filter(Boolean).join(", ");
  const title = `Prakiraan cuaca ${where}${province ? ` (${province})` : ""}`;

  const steps: string[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const forecast = row.cuaca;
    if (!Array.isArray(forecast)) continue;
    for (const day of forecast) {
      const entries = Array.isArray(day) ? day : [day];
      for (const entry of entries) {
        if (!isRecord(entry)) continue;
        const described = describeStep(entry);
        if (described) steps.push(described);
        if (steps.length >= 4) break;
      }
      if (steps.length >= 4) break;
    }
    if (steps.length >= 4) break;
  }
  if (!steps.length) return null;

  return { title, summary: `${title}. ${steps.join("; ")}.` };
}

/**
 * Derive a reviewer-readable title and summary from a JSON document, or null
 * when the text is not JSON or is a shape this file does not recognise.
 */
export function summarizeJsonPayload(text: string): JsonSummary | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  return summarizeQuake(parsed) ?? summarizeForecast(parsed);
}
