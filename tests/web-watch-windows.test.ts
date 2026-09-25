import { describe, expect, it } from "vitest";
import { resolveThresholds } from "@/lib/agent/thresholds";
import { buildCandidate } from "@/lib/web-watch/check";
import { extractLinks, type SourceText } from "@/lib/web-watch/fetching";
import { sentenceSpans } from "@/lib/web-watch/triage";
import { newSourceState, type WatchedSource } from "@/lib/web-watch/types";
import { proseWindows } from "@/lib/web-watch/windows";

const t = resolveThresholds();
const opts = { maxWindows: t.webWatchNliMaxWindows, minWords: t.webWatchProseSentenceMinWords, maxChars: t.webWatchNliWindowChars };

const PROSE = [
  "Bank Indonesia memutuskan untuk mempertahankan suku bunga acuan pada rapat dewan gubernur bulan ini.",
  "Keputusan itu sejalan dengan upaya menjaga stabilitas nilai tukar rupiah di tengah ketidakpastian global.",
  "Bank sentral juga memperkuat operasi moneter untuk memastikan likuiditas perbankan tetap memadai.",
];
const CHROME = [
  ".css-1x2y3z{display:flex} .nav-item{margin:0}",
  "Beranda",
  "Tentang Kami",
  "Siaran Pers",
  "Baca Juga: Rupiah Menguat Tipis",
].join("\n");

describe("sentenceSpans", () => {
  it("keeps a sentence whole across a number with a dot", () => {
    const [span] = sentenceSpans("BBRI mencatat penurunan terdalam, yakni 3,64% ke level Rp 3.180 per saham.");
    expect(span.text).toBe("BBRI mencatat penurunan terdalam, yakni 3,64% ke level Rp 3.180 per saham.");
    expect(span.start).toBe(0);
  });

  it("reports where each sentence starts in the text", () => {
    const text = `menu\n  ${PROSE[0]} ${PROSE[1]}`;
    const spans = sentenceSpans(text, opts.minWords);
    expect(spans.map((s) => text.slice(s.start, s.start + s.text.length))).toEqual([PROSE[0], PROSE[1]]);
  });
});

describe("proseWindows", () => {
  it("never opens a window on page chrome", () => {
    const body = `${CHROME}\n${PROSE.join(" ")}`;
    const windows = proseWindows(body, opts);
    expect(windows).toHaveLength(1);
    expect(windows[0].start).toBe(body.indexOf(PROSE[0]));
    expect(windows[0].text).toBe(PROSE.join(" "));
  });

  it("packs sentences up to the character cap and stops at the window cap", () => {
    const maxChars = PROSE[0].length + 1 + PROSE[1].length;
    const windows = proseWindows(PROSE.join(" "), { ...opts, maxChars, maxWindows: 1 });
    expect(windows).toEqual([{ text: `${PROSE[0]} ${PROSE[1]}`, start: 0 }]);
    const all = proseWindows(PROSE.join(" "), { ...opts, maxChars });
    expect(all.map((w) => w.text)).toEqual([`${PROSE[0]} ${PROSE[1]}`, PROSE[2]]);
  });

  it("cuts a sentence longer than the cap into its own window", () => {
    const windows = proseWindows(PROSE[0], { ...opts, maxChars: 20 });
    expect(windows).toEqual([{ text: PROSE[0].slice(0, 20), start: 0 }]);
  });

  it("returns nothing for an empty or chrome-only body", () => {
    expect(proseWindows("", opts)).toEqual([]);
    expect(proseWindows(CHROME, opts)).toEqual([]);
  });
});

describe("URL-derived titles", () => {
  const listing: WatchedSource = {
    id: "src-bi",
    url: "https://www.bi.go.id/id/publikasi/ruang-media/news-release/default.aspx",
    label: "BI siaran pers",
    kind: "listing",
    enabled: true,
    checkIntervalHours: 24,
    category: "rates",
    sourceType: "policy",
    linkPattern: "/news-release/Pages/sp_\\d+\\.aspx",
  };
  const state = newSourceState(listing);
  const text = { text: `${CHROME}\n${PROSE.join(" ")}`, method: "html" } as SourceText;
  const url = "https://www.bi.go.id/id/publikasi/ruang-media/news-release/Pages/sp_2819226.aspx";
  const now = "2026-09-24T10:00:00.000Z";

  it("flags a listing link with no text, and only that one", () => {
    const links = extractLinks(
      `<a href="${url}"><img src="x.png"/></a><a href="${url.replace("2819226", "2819227")}">BI-Rate Tetap</a>`,
      listing.url,
      listing.linkPattern!,
    );
    expect(links[0]).toMatchObject({ title: "sp 2819226.aspx", titleFromUrl: true });
    expect(links[1].titleFromUrl).toBeUndefined();
  });

  it("uses the first prose sentence as the headline, and keeps the id", () => {
    const fixed = buildCandidate(state, text, url, "sp 2819226.aspx", null, url, now, true);
    const before = buildCandidate(state, text, url, "sp 2819226.aspx", null, url, now);
    expect(fixed.title).toBe(PROSE[0]);
    expect(fixed.titleSource).toBe("body");
    expect(before.titleSource).toBe("feed");
    expect(fixed.id).toBe(before.id);
  });

  it("keeps the slug, marked as such, when the body has no prose", () => {
    const slug = "produksi-cpo-cukup-untuk-b50";
    const candidate = buildCandidate(state, { text: CHROME, method: "html" } as SourceText, url, slug, null, url, now, true);
    expect(candidate.title).toBe(slug);
    expect(candidate.titleSource).toBe("url");
  });
});
