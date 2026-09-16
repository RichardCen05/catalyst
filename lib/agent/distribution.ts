import type { BrokerEvidence, InstitutionalFlow } from "@/lib/types";

/**
 * Distribusi institusional ("whale") — murni dari rekaman, tanpa tebakan.
 * - netInstitutionalFlow memakai transactionValue terekam bila ada;
 *   hanya bila tak ada, jatuh ke sharesDelta × referencePrice.
 * - brokerChurnRatio adalah PROKSI crossing/block; pasar nego tidak
 *   teramati pada sumber ini (dinyatakan eksplisit di calculation.notes).
 */

export interface NetFlowResult {
  netShares: number;
  netValue: number;
  topHolders: Array<{ holderName: string; netShares: number; netValue: number }>;
}

export function netInstitutionalFlow(
  flows: InstitutionalFlow[],
  opts?: { windowStart?: string; windowEnd?: string; referencePrice?: number },
): NetFlowResult {
  const inWindow = flows.filter((f) => {
    if (opts?.windowStart && f.filedAt < opts.windowStart) return false;
    if (opts?.windowEnd && f.filedAt > opts.windowEnd) return false;
    return true;
  });
  let netShares = 0;
  let netValue = 0;
  const byHolder = new Map<string, { netShares: number; netValue: number }>();
  for (const f of inWindow) {
    const delta = f.sharesDelta;
    // Rekaman beats turunan: pakai transaction_value bila terekam.
    const value = typeof f.transactionValue === "number"
      ? Math.sign(delta) >= 0 ? Math.abs(f.transactionValue) : -Math.abs(f.transactionValue)
      : typeof opts?.referencePrice === "number" ? delta * opts.referencePrice : 0;
    // Tanda mengikuti arah delta; transaction_value rekaman selalu positif.
    netShares += delta;
    netValue += value;
    const cur = byHolder.get(f.holderName) ?? { netShares: 0, netValue: 0 };
    cur.netShares += delta;
    cur.netValue += value;
    byHolder.set(f.holderName, cur);
  }
  const topHolders = [...byHolder.entries()]
    .map(([holderName, v]) => ({ holderName, ...v }))
    .sort((a, b) => Math.abs(b.netValue) - Math.abs(a.netValue))
    .slice(0, 3);
  return { netShares, netValue, topHolders };
}

export function detectDistributionDivergence(args: {
  priceReturn: number;
  netValue: number;
  floor: number;
}): boolean {
  // Inti peringatan interview: harga naik di reguler sementara whale jualan.
  return args.priceReturn > 0 && args.netValue < -Math.abs(args.floor);
}

export interface ChurnRow {
  code: string;
  origin: "local" | "foreign";
  buyIdr: number;
  sellIdr: number;
  netIdr: number;
  churnRatio: number;
}

export function brokerChurnRatio(broker: BrokerEvidence): ChurnRow[] {
  const seen = new Map<string, ChurnRow>();
  const all = [...broker.buyers, ...broker.sellers];
  for (const p of all) {
    if (seen.has(p.code)) continue;
    const buy = typeof p.buyIdr === "number" ? p.buyIdr : p.value;
    const sell = typeof p.sellIdr === "number" ? p.sellIdr : 0;
    const net = typeof p.netIdr === "number" ? p.netIdr : p.value;
    const churnRatio = (buy + sell) / Math.max(Math.abs(net), 1);
    seen.set(p.code, { code: p.code, origin: p.origin, buyIdr: buy, sellIdr: sell, netIdr: net, churnRatio });
  }
  return [...seen.values()].sort((a, b) => b.churnRatio - a.churnRatio);
}
