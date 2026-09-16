import type { PricePoint } from "@/lib/types";
import type { VolumeFloors } from "@/lib/agent/metrics";

export interface SignalStability {
  /** Robust-z of the latest session against each trailing sub-window. */
  windowScores: Array<{ label: string; robustZ: number | null; status: string }>;
  /** How many of the scored windows agree on direction (elevated vs normal). */
  agreement: string;
  note: string;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function robustZ(latest: number, baseline: number[]): number | null {
  if (baseline.length < 5) return null;
  const med = median(baseline);
  const mad = median(baseline.map((value) => Math.abs(value - med)));
  if (mad === 0) return null;
  return (0.6745 * (latest - med)) / mad;
}

function statusFor(z: number | null, floors?: VolumeFloors): string {
  if (z === null) return "Data belum cukup";
  // C5: di-thread lewat resolveThresholds agar slider menggerakkan label ini juga.
  // Default disatukan ke live values mesin (5/2.5), bukan 3/2 lama di file ini.
  const elevated = typeof floors?.elevated === "number" ? floors.elevated : 2.5;
  const extreme = typeof floors?.extreme === "number" ? floors.extreme : 5;
  if (z >= extreme) return "Ekstrem";
  if (z >= elevated) return "Meningkat";
  return "Normal";
}

/**
 * Recompute the volume anomaly over trailing halves of the recorded window.
 * Same formula as the engine, sliced differently — a stability read, not a
 * new signal. Honest about short baselines: windows under 5 sessions report
 * "Data belum cukup" instead of a number.
 */
export function describeSignalStability(series: PricePoint[], floors?: VolumeFloors): SignalStability {
  if (series.length < 8) {
    return {
      windowScores: [],
      agreement: "Jendela rekaman terlalu pendek untuk uji stabilitas.",
      note: "Butuh minimal 8 sesi untuk membagi pembanding menjadi dua paruh.",
    };
  }
  const volumes = series.map((point) => point.volume);
  const latest = volumes.at(-1)!;
  const baseline = volumes.slice(0, -1);
  const half = Math.floor(baseline.length / 2);
  const slices: Array<{ label: string; data: number[] }> = [
    { label: "Paruh awal", data: baseline.slice(0, half) },
    { label: "Paruh akhir", data: baseline.slice(half) },
    { label: "Pembanding penuh", data: baseline },
  ];
  const windowScores = slices.map(({ label, data }) => {
    const z = robustZ(latest, data);
    return { label, robustZ: z, status: statusFor(z, floors) };
  });
  const elevated = windowScores.filter((item) => item.status === "Meningkat" || item.status === "Ekstrem").length;
  const scored = windowScores.filter((item) => item.robustZ !== null).length;
  const agreement = scored === 0
    ? "Tidak ada paruh yang cukup panjang untuk dinilai."
    : elevated === scored
      ? `Anomali bertahan di ${scored}/${scored} paruh — sinyal stabil, bukan artefak satu paruh.`
      : elevated === 0
        ? `Normal di ${scored}/${scored} paruh — lonjakan terakhir tidak konsisten.`
        : `Campuran: meningkat di ${elevated}/${scored} paruh — periksa tanggal lonjakan sebelum menyimpulkan.`;
  return {
    windowScores,
    agreement,
    note: "Dihitung ulang dari seri volume terekam yang sama dengan rumus robust-z mesin.",
  };
}
