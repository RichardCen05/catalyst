import { companies, events, DATA_AS_OF } from "@/lib/data/fixtures";
import { METRIC_ALIASES, METRIC_FORMULA } from "@/lib/agent/explain";
import { DEFAULT_THRESHOLDS, PILLAR_LABELS, THRESHOLD_PROVENANCE } from "@/lib/agent/thresholds";
import { normalizeQuery, SYMBOL_ALIASES } from "@/lib/agent/query";
import { viewEntries } from "@/lib/agent/retrieval/context";
import { buildCaseBundle } from "@/lib/agent/retrieval/context/case";
import { buildEventBundle } from "@/lib/agent/retrieval/context/event";
import { buildMetricBundle } from "@/lib/agent/retrieval/context/metric";
import { buildThresholdBundle } from "@/lib/agent/retrieval/context/threshold";
import type { CorpusEntry } from "@/lib/agent/retrieval/types";

export interface CorpusIndex {
  entries: CorpusEntry[];
  /** term to entry ids, so scoring touches only what shares a word. */
  byTerm: Map<string, string[]>;
  byId: Map<string, CorpusEntry>;
}

/** Content words of a phrase, normalized the way questions are. */
function termsOf(...phrases: string[]): string[] {
  const out = new Set<string>();
  for (const phrase of phrases) {
    const normalized = normalizeQuery(phrase);
    if (!normalized) continue;
    out.add(normalized);
    for (const word of normalized.split(" ")) {
      if (word.length >= 3) out.add(word);
    }
  }
  return [...out];
}

function caseEntries(): CorpusEntry[] {
  return companies.map((company) => ({
    id: `case:${company.symbol}`,
    kind: "case" as const,
    symbols: [company.symbol],
    view: "case" as const,
    terms: termsOf(company.symbol, company.name, company.sector, company.subsector,
      ...(SYMBOL_ALIASES[company.symbol] ?? [])),
    load: () => buildCaseBundle(company.symbol),
  }));
}

function eventEntries(): CorpusEntry[] {
  return events.map((event) => ({
    id: `event:${event.id}`,
    kind: "event" as const,
    symbols: event.impactLinks.map((link) => link.symbol),
    view: "impact" as const,
    terms: termsOf(event.title, event.summary, event.category, String(event.sector)),
    load: () => buildEventBundle(event.id),
  }));
}

function metricEntries(): CorpusEntry[] {
  const labels = new Set([...Object.keys(METRIC_FORMULA), ...Object.keys(METRIC_ALIASES)]);
  return [...labels].map((label) => ({
    id: `metric:${label}`,
    kind: "metric" as const,
    symbols: [],
    terms: termsOf(label, METRIC_FORMULA[label] ?? "", ...(METRIC_ALIASES[label] ?? [])),
    load: () => buildMetricBundle(label),
  }));
}

function thresholdEntries(): CorpusEntry[] {
  return (Object.keys(DEFAULT_THRESHOLDS) as Array<keyof typeof DEFAULT_THRESHOLDS>).map((key) => ({
    id: `threshold:${key}`,
    kind: "threshold" as const,
    symbols: [],
    view: "method" as const,
    // The camelCase name split into words is how a reader would say it aloud;
    // the raw key is how it appears in the repository. Both reach the entry.
    // The key is English and the reader's question is not, so the pillar's own
    // Indonesian name joins the terms whenever the key belongs to one.
    terms: termsOf(key, key.replace(/([A-Z])/g, " $1"), "ambang", "threshold", "batas",
      THRESHOLD_PROVENANCE[key],
      Object.entries(PILLAR_LABELS).find(([pillar]) => key.startsWith(pillar))?.[1] ?? ""),
    load: () => buildThresholdBundle(key),
  }));
}

export function buildCorpus(): CorpusIndex {
  const entries = [
    ...caseEntries(),
    ...eventEntries(),
    ...metricEntries(),
    ...thresholdEntries(),
    ...viewEntries(),
  ];
  const byTerm = new Map<string, string[]>();
  const byId = new Map<string, CorpusEntry>();
  for (const entry of entries) {
    byId.set(entry.id, entry);
    for (const term of entry.terms) {
      const owners = byTerm.get(term) ?? [];
      owners.push(entry.id);
      byTerm.set(term, owners);
    }
  }
  return { entries, byTerm, byId };
}

/**
 * The index, built once per instance.
 *
 * Everything it derives from is generated at build time, so the only thing
 * that can invalidate it is a different recording set — which is exactly what
 * `DATA_AS_OF` names. Keying on that means a refresh rebuilds the index rather
 * than serving terms for recordings the app no longer holds.
 */
let cached: { asOf: string; index: CorpusIndex } | null = null;

export function getCorpus(): CorpusIndex {
  if (cached?.asOf === DATA_AS_OF) return cached.index;
  cached = { asOf: DATA_AS_OF, index: buildCorpus() };
  return cached.index;
}
