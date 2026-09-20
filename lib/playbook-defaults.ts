import { companies, coverageInfo, events } from "@/lib/data/fixtures";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { dimensionFromText, DIMENSION_LABELS, DIMENSION_OBSERVABLES } from "@/lib/agent/dimensions";
import { uiLabel } from "@/lib/ui-labels";
import type { InvestorResearchPlaybook, LearnedPreference, SymbolCode, UserProfile } from "@/lib/types";

/**
 * The starting playbook, written from the recordings instead of typed out.
 *
 * This file used to hold six hand-written lines per list — one per ticker —
 * stating which drivers reach which issuer and what would falsify each thesis.
 * Nothing re-checked them: a recording refresh could remove a symbol, or move
 * a driver, and the seeded playbook would go on asserting the old story while
 * every figure beside it had already moved. The lines below are assembled from
 * the same recorded impact paths the cases are built from, through format
 * strings that are true of every case.
 *
 * Each recorded link states its own path — "Harga komoditas → realisasi harga
 * → margin". The head is the driver, the tail is the business outcome it has
 * to reach. That is all these sentences claim.
 */

interface SymbolExposure {
  symbol: SymbolCode;
  drivers: string[];
  dimensions: string[];
}

function sentenceCase(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed[0].toUpperCase() + trimmed.slice(1) : trimmed;
}

/** Drivers and outcomes each analyzed symbol actually has a recording for.
 *  Ranked by how often the recordings state them, so the line leads with the
 *  path the record carries most — not with whichever word sorts first. */
function recordedExposures(): SymbolExposure[] {
  const drivers = new Map<SymbolCode, Map<string, number>>();
  const dimensions = new Map<SymbolCode, Map<string, number>>();
  const bump = (store: Map<SymbolCode, Map<string, number>>, symbol: SymbolCode, key: string) => {
    let counts = store.get(symbol);
    if (!counts) {
      counts = new Map<string, number>();
      store.set(symbol, counts);
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  const ranked = (counts?: Map<string, number>): string[] =>
    [...(counts ?? [])].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key]) => key);

  for (const event of events) {
    for (const link of event.impactLinks) {
      if (link.direction === "Unrelated" || !link.path) continue;
      const parts = link.path.split("\u2192").map((part) => part.trim()).filter(Boolean);
      if (parts.length < 2) continue;
      bump(drivers, link.symbol, parts[0].toLowerCase());
      const dimension = dimensionFromText(parts[parts.length - 1]);
      if (dimension) bump(dimensions, link.symbol, dimension);
    }
  }
  return companies
    .filter((company) => company.analyzed && drivers.has(company.symbol))
    .map((company) => ({
      symbol: company.symbol,
      drivers: ranked(drivers.get(company.symbol)),
      dimensions: ranked(dimensions.get(company.symbol)),
    }));
}

/** Comparables are the other recorded issuers in the same subsector, then the
 *  same sector. A price recording is the bar — a peer a reader can actually
 *  chart — because a typed pairing would outlive the recording that justified
 *  it. */
function recordedComparables(): Partial<Record<SymbolCode, SymbolCode[]>> {
  const out: Partial<Record<SymbolCode, SymbolCode[]>> = {};
  const chartable = companies.filter((company) => coverageInfo[company.symbol]?.hasPriceSeries);
  for (const company of chartable) {
    const peers = chartable.filter((other) => other.symbol !== company.symbol);
    const sameSubsector = peers.filter((other) => other.subsector === company.subsector);
    const sameSector = peers.filter((other) => other.sector === company.sector && other.subsector !== company.subsector);
    const picked = [...sameSubsector, ...sameSector].map((other) => other.symbol);
    if (picked.length) out[company.symbol] = picked;
  }
  return out;
}

function exposureLines(exposures: SymbolExposure[]): string[] {
  return exposures.map((item) => `${item.symbol}: ${item.drivers.join(", ")}.`);
}

function assumptionLines(exposures: SymbolExposure[]): string[] {
  return exposures
    .filter((item) => item.dimensions.length)
    .map((item) => {
      // Top two outcomes the recordings actually reach for this symbol; the
      // full list reads as a catalogue rather than an assumption.
      const outcomes = item.dimensions.slice(0, 2).map((dimension) => DIMENSION_LABELS[dimension as keyof typeof DIMENSION_LABELS].toLowerCase());
      return `${item.symbol}: ${sentenceCase(item.drivers[0])} perlu sampai ke ${outcomes.join(" atau ")} sebelum dianggap material.`;
    });
}

function falsifierLines(exposures: SymbolExposure[]): string[] {
  return exposures
    .filter((item) => item.dimensions.length)
    .map((item) => {
      const observable = DIMENSION_OBSERVABLES[item.dimensions[0] as keyof typeof DIMENSION_OBSERVABLES].toLowerCase();
      return `${item.symbol}: hipotesis melemah bila ${observable} tidak ikut berubah setelah ${item.drivers[0]} bergerak.`;
    });
}

export function buildDefaultPlaybook(): InvestorResearchPlaybook {
  const exposures = recordedExposures();
  const outcomes = Object.values(DIMENSION_LABELS).map((label) => label.toLowerCase());
  return {
    preferredComparables: recordedComparables(),
    materialityRules: [`Prioritaskan perubahan yang dapat memengaruhi ${outcomes.slice(0, 3).join(", ")}.`],
    knownExposures: exposureLines(exposures),
    thesisAssumptions: assumptionLines(exposures),
    trustedSources: ["Data keuangan Sectors dan keterbukaan emiten sebelum berita sekunder."],
    falsifiers: falsifierLines(exposures),
    relevanceFloor: DEFAULT_THRESHOLDS.relevanceFloor,
  };
}

/**
 * Seeded memory. Both lines describe choices the reader made at setup, so they
 * read back the profile they were made from rather than naming a pillar and a
 * sector that a different seeded profile would contradict.
 */
export function buildBasePreferences(profile: UserProfile): LearnedPreference[] {
  const firstPillar = profile.config.pillarOrder[0];
  const firstSector = profile.preferredSectors[0];
  const out: LearnedPreference[] = [];
  if (firstPillar) {
    out.push({
      id: "pref-order",
      label: `Mulai dari ${uiLabel(firstPillar)}`,
      explanation: "Dipilih langsung saat pengaturan awal.",
      source: "explicit",
      active: true,
    });
  }
  if (firstSector) {
    out.push({
      id: "pref-sector",
      label: `Prioritaskan ${uiLabel(firstSector).toLowerCase()}`,
      explanation: "Berasal dari daftar pantauan aktif.",
      source: "explicit",
      active: true,
    });
  }
  return out;
}
