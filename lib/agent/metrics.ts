import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";

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
  // Fallback membaca DEFAULT_THRESHOLDS, bukan mengulang 2.5 dan 5 di sini:
  // salinan kedua sebuah ambang adalah ambang yang bisa melenceng dari yang
  // dipakai pilar lain. signal-history.ts sudah memakai pola yang sama.
  const elevatedFloor = typeof floors?.elevated === "number" ? floors.elevated : DEFAULT_THRESHOLDS.volumeZFloor;
  const extremeFloor = typeof floors?.extreme === "number" ? floors.extreme : DEFAULT_THRESHOLDS.volumeExtremeFloor;
  return {
    robustZ,
    status: absolute >= extremeFloor ? "Extreme" : absolute >= elevatedFloor ? "Elevated" : "Normal",
  };
}

export interface MomentumFloors {
  /** |residual| di bawah ini = Market-aligned; default DEFAULT_THRESHOLDS.momentumAlignedFloor. */
  aligned?: number;
  /** |sectorGap| di bawah ini = Sector-led; default DEFAULT_THRESHOLDS.momentumSectorFloor. */
  sector?: number;
  /** |residual| di atas ini = Idiosyncratic; default DEFAULT_THRESHOLDS.momentumIdiosyncraticFloor. */
  idiosyncratic?: number;
}

/**
 * Residual = imbal hasil emiten dikurangi bagian yang dijelaskan pasar (beta ×
 * IHSG). Status "Idiosyncratic" berarti gerak itu TIDAK dijelaskan pasar
 * maupun sektornya — kontrol confounder kasar, dan satu-satunya label di sini
 * yang layak dipakai untuk menilai apakah sebuah berita berbarengan dengan
 * gerak harga (bukan menyebabkannya).
 *
 * Ambangnya dulu hardcode 0.012 / 0.015 / 0.03 dan tidak pernah muncul di
 * ruleTrace, sehingga label momentum tiap kasus ditentukan tiga angka yang
 * tidak pernah disebut ke siapa pun. Sekarang di-thread lewat
 * resolveThresholds seperti ambang volume dan konsentrasi.
 */
export function calculateMomentum(
  stockReturn: number,
  marketReturn: number,
  beta: number,
  sectorReturn: number,
  floors?: MomentumFloors,
): { residual: number; status: "Market-aligned" | "Sector-led" | "Idiosyncratic" | "Mixed" } {
  const residual = round(stockReturn - beta * marketReturn);
  const sectorGap = stockReturn - sectorReturn;
  const aligned = typeof floors?.aligned === "number" ? floors.aligned : DEFAULT_THRESHOLDS.momentumAlignedFloor;
  const sector = typeof floors?.sector === "number" ? floors.sector : DEFAULT_THRESHOLDS.momentumSectorFloor;
  const idiosyncratic = typeof floors?.idiosyncratic === "number" ? floors.idiosyncratic : DEFAULT_THRESHOLDS.momentumIdiosyncraticFloor;
  let status: "Market-aligned" | "Sector-led" | "Idiosyncratic" | "Mixed" = "Mixed";
  if (Math.abs(residual) < aligned) status = "Market-aligned";
  else if (Math.abs(sectorGap) < sector) status = "Sector-led";
  else if (Math.abs(residual) >= idiosyncratic) status = "Idiosyncratic";
  return { residual, status };
}

export function detectFlowContradiction(
  foreignBrokerBuyerShare: number,
  netForeign: number,
  share?: number,
): boolean {
  const floor = typeof share === "number" ? share : DEFAULT_THRESHOLDS.foreignContradictionShare;
  return foreignBrokerBuyerShare >= floor && netForeign < 0;
}
