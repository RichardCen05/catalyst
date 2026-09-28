import { ENDPOINT_SUMMARY_CLAIMS_MAX } from "@/lib/schemas";

/** One feed the citation panel asks `/api/endpoint-summary` to describe. */
export type EndpointSummaryClaim = { endpoint: string; field: string; symbol?: string };

/** Identity of a claim for caching: the address and the columns it reads. */
export function claimKey(claim: { endpoint: string; field: string }): string {
  return `${claim.endpoint}\u0000${claim.field}`;
}

/**
 * Cut claims into request bodies the route will accept. A body over
 * `ENDPOINT_SUMMARY_CLAIMS_MAX` is answered with 400, so a panel citing more
 * feeds than that sends several requests. Duplicates are dropped first, since
 * the route would answer them once anyway.
 */
export function batchClaims(claims: EndpointSummaryClaim[]): EndpointSummaryClaim[][] {
  const unique = [...new Map(claims.map((claim) => [claimKey(claim), claim])).values()];
  const batches: EndpointSummaryClaim[][] = [];
  for (let start = 0; start < unique.length; start += ENDPOINT_SUMMARY_CLAIMS_MAX) {
    batches.push(unique.slice(start, start + ENDPOINT_SUMMARY_CLAIMS_MAX));
  }
  return batches;
}
