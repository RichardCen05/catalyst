import { describe, expect, it } from "vitest";
import { brokerChurnRatio, detectDistributionDivergence, netInstitutionalFlow } from "@/lib/agent/distribution";
import type { InstitutionalFlow } from "@/lib/types";

const mk = (over: Partial<InstitutionalFlow>): InstitutionalFlow => ({
  symbol: "GOTO",
  holderName: "Test Holder",
  holderType: "institution",
  transactionType: "others",
  sharesBefore: 100,
  sharesAfter: 80,
  sharesDelta: -20,
  filedAt: "2026-09-10T16:56:31+07:00",
  source: "https://www.idx.co.id/x.pdf",
  ...over,
});

describe("distribution", () => {
  it("sums signed deltas and prefers recorded transaction_value", () => {
    const flows = [
      mk({ holderName: "A", sharesDelta: 100, transactionValue: 1000 }),
      mk({ holderName: "B", sharesDelta: -40, transactionValue: 500 }),
    ];
    const out = netInstitutionalFlow(flows, { referencePrice: 10 });
    expect(out.netShares).toBe(60);
    // A +, B - (tanda mengikuti delta, bukan nilai mentah).
    expect(out.netValue).toBe(500);
    expect(out.topHolders[0].holderName).toBe("A");
  });

  it("divergence fires only when both conditions hold", () => {
    expect(detectDistributionDivergence({ priceReturn: 0.05, netValue: -2e11, floor: 1e11 })).toBe(true);
    expect(detectDistributionDivergence({ priceReturn: -0.05, netValue: -2e11, floor: 1e11 })).toBe(false);
    expect(detectDistributionDivergence({ priceReturn: 0.05, netValue: -5e10, floor: 1e11 })).toBe(false);
    expect(detectDistributionDivergence({ priceReturn: 0.05, netValue: 2e11, floor: 1e11 })).toBe(false);
  });

  it("zero-flow symbol yields no flag and no crash", () => {
    const out = netInstitutionalFlow([]);
    expect(out.netShares).toBe(0);
    expect(out.netValue).toBe(0);
    expect(out.topHolders).toEqual([]);
    expect(detectDistributionDivergence({ priceReturn: 0.03, netValue: 0, floor: 1e11 })).toBe(false);
  });

  it("churn ratio with net_idr = 0 does not divide by zero", () => {
    const rows = brokerChurnRatio({
      buyers: [{ code: "YU", origin: "foreign", value: 100, buyIdr: 100, sellIdr: 100, netIdr: 0 }],
      sellers: [],
      netForeign: 0,
      totalMarketValue: 1000,
      freeFloatShares: 1000,
      sharesOutstanding: 2000,
      referencePrice: 100,
    });
    expect(rows).toHaveLength(1);
    expect(Number.isFinite(rows[0].churnRatio)).toBe(true);
    expect(rows[0].churnRatio).toBe(200);
  });
});
