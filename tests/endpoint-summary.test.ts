import { describe, expect, it } from "vitest";
import { summarizeEndpointWithLlm } from "@/lib/agent/llm/endpoint-summary";
import { lookupEndpointClaim } from "@/lib/data/endpoint-registry";

/**
 * The panel's plain-words line is written by a model, so the guards around it
 * are the feature. A summary is provenance: it tells a reader what a recording
 * contains before they decide whether the figure on screen is worth trusting.
 * A model that pads it with a figure, or describes the request plumbing, has
 * made the panel less honest than the raw path it replaced.
 */
const claim = (endpoint: string, field: string) => {
  const found = lookupEndpointClaim(endpoint, field);
  if (!found) throw new Error(`fixture citation missing: ${endpoint} (${field})`);
  return { endpoint: found.endpoint, field: found.field, provider: found.provider };
};

const stub = (summary: string) => async () => ({ summary }) as never;

describe("ringkasan alamat data", () => {
  const foreign = claim("/v2/foreign-flow/ANTM/", "date, net_foreign_inflow");

  it("meneruskan alamat, nama kolom, dan artinya ke model", async () => {
    let contents = "";
    await summarizeEndpointWithLlm(foreign, (async (params: { contents: string }) => {
      contents = params.contents;
      return { summary: "Selisih beli dan jual investor asing tiap hari bursa untuk satu emiten." };
    }) as never);
    expect(contents).toContain("/v2/foreign-flow/{symbol}/");
    expect(contents).toContain("date, net_foreign_inflow");
    // The gloss travels too, so the model is not guessing what a column means.
    expect(contents).toContain("arus asing bersih harian");
  });

  it("menolak ringkasan yang memuat angka", async () => {
    await expect(summarizeEndpointWithLlm(foreign, stub("Arus asing bersih 27,5% dari total transaksi.") as never)).rejects.toThrow(/rejected/);
  });

  it("menolak ringkasan yang menjelaskan pipa, bukan datanya", async () => {
    await expect(summarizeEndpointWithLlm(foreign, stub("Endpoint ini mengembalikan JSON arus asing.") as never)).rejects.toThrow(/plumbing/);
  });

  it("menolak ringkasan yang menyebut satu emiten", async () => {
    // One sentence is cached per feed, so "untuk saham ANTM" would ship under
    // every other emiten reading the same recording.
    await expect(summarizeEndpointWithLlm(foreign, stub("Arus asing bersih harian untuk saham ANTM.") as never)).rejects.toThrow(/names one emiten/);
  });

  it("menolak ringkasan kosong atau kepanjangan", async () => {
    await expect(summarizeEndpointWithLlm(foreign, stub("   ") as never)).rejects.toThrow(/empty/);
    await expect(summarizeEndpointWithLlm(foreign, stub("kata ".repeat(40)) as never)).rejects.toThrow(/longer than one sentence/);
  });

  it("menerima satu kalimat deskriptif", async () => {
    const draft = await summarizeEndpointWithLlm(foreign, stub("  Selisih beli dan jual investor asing tiap hari bursa untuk satu emiten.  ") as never);
    expect(draft.summary).toBe("Selisih beli dan jual investor asing tiap hari bursa untuk satu emiten.");
  });
});
