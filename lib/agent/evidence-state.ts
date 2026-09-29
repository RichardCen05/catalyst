import type { EvidenceState, ImpactDirection } from "@/lib/types";

type VolumeStatus = "Normal" | "Elevated" | "Extreme" | "Insufficient Data";
type MomentumStatus = "Market-aligned" | "Sector-led" | "Idiosyncratic" | "Mixed";

/**
 * The market layer confirms a case when trading is out of its usual range or
 * the move is the issuer's own. A normal volume with a move the market or the
 * sector explains confirms nothing: the hypothesis trace already marks both
 * pillars "challenged" then.
 */
export function marketConfirms(volume: VolumeStatus, momentum: MomentumStatus): boolean {
  return volume === "Elevated" || volume === "Extreme" || momentum === "Idiosyncratic";
}

/** The contradiction a case carries when the market layer does not confirm
 *  it. Structural: true of every such case, and it names no figure. */
export const MARKET_UNCONFIRMED =
  "Konfirmasi pasar belum ada: volume masih dalam rentang pembanding dan gerak harga belum khusus emiten, jadi bukti bisnis berdiri sendiri.";

export interface EvidenceInputs {
  conflict: boolean;
  timingAgainst: boolean;
  volume: VolumeStatus;
  momentum: MomentumStatus;
  catalystDirection: ImpactDirection;
  anyAdverse: boolean;
  /** The state the recordings carry for the company's business layer. */
  recorded: EvidenceState;
}

/**
 * A case's evidence state. "Corroborated" means the market and the business
 * layer agree, so the recorded state stands as corroborated only when the
 * market confirms it; otherwise the layers disagree and the case is mixed.
 * ANTM read "Bukti selaras" with normal volume and a sector-led move (QA P1-5).
 */
export function deriveEvidenceState(input: EvidenceInputs): EvidenceState {
  if (input.conflict || input.timingAgainst) return "Mixed Evidence";
  if (input.volume === "Insufficient Data" || input.catalystDirection === "Unverified") return "Insufficient Evidence";
  if (input.anyAdverse) return "Mixed Evidence";
  if (input.recorded === "Corroborated" && !marketConfirms(input.volume, input.momentum)) return "Mixed Evidence";
  return input.recorded;
}
