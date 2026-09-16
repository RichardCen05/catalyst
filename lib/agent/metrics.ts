export interface ConcentrationResult {
  topBuyerShare: number;
  hhi: number;
  effectiveBuyers: number;
  foreignShare: number;
  floatAbsorbed: number;
}

const round = (value: number, decimals = 6) =>
  Number(value.toFixed(decimals));

export function calculateConcentration(
  buyerValues: number[],
  flow: { netForeign: number; totalMarketValue: number },
  ownership: { freeFloatShares: number; referencePrice: number },
): ConcentrationResult {
  const totalBuy = buyerValues.reduce((sum, value) => sum + value, 0);
  if (totalBuy <= 0) {
    return { topBuyerShare: 0, hhi: 0, effectiveBuyers: 0, foreignShare: 0, floatAbsorbed: 0 };
  }

  const shares = buyerValues.map((value) => value / totalBuy);
  const hhi = shares.reduce((sum, share) => sum + share ** 2, 0);
  return {
    topBuyerShare: round(Math.max(...shares)),
    hhi: round(hhi),
    effectiveBuyers: round(1 / hhi),
    foreignShare: round(flow.netForeign / flow.totalMarketValue),
    floatAbsorbed: round(totalBuy / (ownership.freeFloatShares * ownership.referencePrice)),
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export interface VolumeFloors {
  /** Elevated floor; default 2.5 (live value sebelum C5). */
  elevated?: number;
  /** Extreme floor; default 5 (live value sebelum C5). */
  extreme?: number;
}

export function calculateVolumeSignal(
  baseline: number[],
  current: number,
  medianDailyValue: number,
  floors?: VolumeFloors,
): { robustZ: number | null; status: "Normal" | "Elevated" | "Extreme" | "Insufficient Data" } {
  if (baseline.length < 8 || medianDailyValue < 10) {
    return { robustZ: null, status: "Insufficient Data" };
  }
  const center = median(baseline);
  const mad = median(baseline.map((value) => Math.abs(value - center)));
  if (mad === 0) {
    return { robustZ: null, status: "Insufficient Data" };
  }
  const robustZ = round((0.6745 * (current - center)) / mad, 2);
  const absolute = Math.abs(robustZ);
  // Di-thread lewat resolveThresholds (C5): default dari live values,
  // bukan tebakan plan (3). elevated 2.5, extreme 5.
  const elevatedFloor = typeof floors?.elevated === "number" ? floors.elevated : 2.5;
  const extremeFloor = typeof floors?.extreme === "number" ? floors.extreme : 5;
  return {
    robustZ,
    status: absolute >= extremeFloor ? "Extreme" : absolute >= elevatedFloor ? "Elevated" : "Normal",
  };
}

export function calculateMomentum(
  stockReturn: number,
  marketReturn: number,
  beta: number,
  sectorReturn: number,
): { residual: number; status: "Market-aligned" | "Sector-led" | "Idiosyncratic" | "Mixed" } {
  const residual = round(stockReturn - beta * marketReturn);
  const sectorGap = stockReturn - sectorReturn;
  let status: "Market-aligned" | "Sector-led" | "Idiosyncratic" | "Mixed" = "Mixed";
  if (Math.abs(residual) < 0.012) status = "Market-aligned";
  else if (Math.abs(sectorGap) < 0.015) status = "Sector-led";
  else if (Math.abs(residual) >= 0.03) status = "Idiosyncratic";
  return { residual, status };
}

export function detectFlowContradiction(foreignBrokerBuyerShare: number, netForeign: number): boolean {
  return foreignBrokerBuyerShare >= 0.55 && netForeign < 0;
}
