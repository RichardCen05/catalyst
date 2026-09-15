export interface EvidenceAvailability {
  analyzed: boolean;
  hasBroker: boolean;
  hasOwnershipSeries: boolean;
  eventCount: number;
  financialRows: number;
}

/**
 * Honest gap list derived from actual recording availability.
 * Replaces the hardcoded 3-string list — same fixture, no invented detail.
 */
export function deriveMissingEvidence(availability: EvidenceAvailability): string[] {
  const missing: string[] = [];
  if (!availability.analyzed || !availability.hasBroker) {
    missing.push("Ringkasan broker dan arus asing tidak terekam untuk emiten ini — kasus lengkap butuh keduanya.");
  }
  if (!availability.hasOwnershipSeries) {
    missing.push("Rincian kepemilikan bulanan tidak terekam untuk emiten ini.");
  }
  if (availability.eventCount === 0) {
    missing.push("Tidak ada peristiwa terverifikasi yang terhubung pada rekaman ini.");
  }
  if (availability.financialRows === 0) {
    missing.push("Laporan keuangan kuartalan tidak terekam untuk emiten ini.");
  }
  missing.push("Data dalam hari perdagangan dan antrean pesanan tidak tersedia.");
  missing.push("Transaksi pihak terafiliasi belum diidentifikasi.");
  return missing;
}
