import { describe, expect, it } from "vitest";
import {
  contentRegion,
  extractLinks,
  htmlToText,
  parseFeed,
  FetchError,
} from "@/lib/web-watch/fetching";

const LONG = "kata ".repeat(80);

describe("htmlToText", () => {
  it("reads the <main> region and drops navigation boilerplate", () => {
    const nav = "tautan navigasi ".repeat(10);
    const html = `<html><body><nav>${nav}</nav><main><h1>BI-Rate tetap 5,50%</h1><p>Rapat dewan gubernur memutuskan.</p><p>${LONG}</p></main></body></html>`;
    const text = htmlToText(html);
    expect(text).toContain("BI-Rate tetap 5,50%");
    expect(text).not.toContain("tautan navigasi");
  });

  it("falls back to the whole document when there is no content region", () => {
    const text = htmlToText(`<html><body><p>${LONG}</p></body></html>`);
    expect(text).toContain("kata kata");
  });

  it("drops script and style whole, keeping row breaks from tables", () => {
    const html = `<html><body><main><script>var x = 1;</script><style>.a{}</style><table><tr><td>A</td></tr><tr><td>B</td></tr></table></main><p>${LONG}</p></body></html>`;
    const text = htmlToText(html);
    expect(text).not.toContain("var x");
    expect(text).toContain("A\nB");
  });

  it("is stable across session-cookie and request-id noise in markup", () => {
    const body = `<main><h1>ICP Agustus naik</h1><p>Harga minyak mentah Indonesia.</p><p>${LONG}</p></main>`;
    const a = htmlToText(`<html><body data-sid="abc123">${body}</body></html>`);
    const b = htmlToText(`<html><body data-sid="xyz999" data-req="42">${body}</body></html>`);
    expect(a).toBe(b);
  });
});

describe("contentRegion", () => {
  it("prefers the largest region and rejects widget-sized ones", () => {
    const big = `<main>${"isi ".repeat(500)}</main>`;
    const small = `<article>teaser</article>`;
    expect(contentRegion(`<html><body>${small}${big}</body></html>`)).toContain("isi isi");
    expect(contentRegion(`<html><body>${"x".repeat(5000)}<article>tiny</article></body></html>`)).toContain("xxx");
  });
});

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Market</title>
<item><guid>https://ex.id/a/1</guid><title><![CDATA[Harga nikel naik]]></title><link>https://ex.id/a/1</link><pubDate>Mon, 14 Sep 2026 10:00:00 +0700</pubDate></item>
<item><title>Tanpa guid</title><link>https://ex.id/a/2</link></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>Energi</title>
<entry><id>urn:eia:1</id><title>Record crude output</title><link href="https://ex.id/e/1" rel="alternate"/><updated>2026-09-10T09:00:00Z</updated></entry>
</feed>`;

describe("parseFeed", () => {
  it("reads RSS items with guid fallback to link", () => {
    const feed = parseFeed(Buffer.from(RSS, "utf8"));
    expect(feed.title).toBe("Market");
    expect(feed.entries).toHaveLength(2);
    expect(feed.entries[0]).toMatchObject({ key: "https://ex.id/a/1", title: "Harga nikel naik" });
    expect(feed.entries[1].key).toBe("https://ex.id/a/2");
  });

  it("reads Atom entries via href attributes", () => {
    const feed = parseFeed(Buffer.from(ATOM, "utf8"));
    expect(feed.entries).toHaveLength(1);
    expect(feed.entries[0]).toMatchObject({ key: "urn:eia:1", link: "https://ex.id/e/1" });
  });

  it("refuses DOCTYPE feeds as permanent", () => {
    const evil = `<?xml version="1.0"?><!DOCTYPE rss [<!ENTITY x "y">]><rss version="2.0"><channel></channel></rss>`;
    try {
      parseFeed(Buffer.from(evil, "utf8"));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(FetchError);
      expect((error as FetchError).permanent).toBe(true);
    }
  });

  it("rejects non-feeds as permanent", () => {
    expect(() => parseFeed(Buffer.from("<html><body>hai</body></html>", "utf8"))).toThrowError(FetchError);
  });
});

describe("extractLinks", () => {
  const markup = `
    <a href="/id/berita-dan-kegiatan/siaran-pers/Pages/RDKB-Agustus-2026.aspx" class="group-item-title">RDKB Agustus 2026</a>
    <a href="/id/berita-dan-kegiatan/siaran-pers/Pages/RDKB-Agustus-2026.aspx">duplikat</a>
    <a href="/id/berita-dan-kegiatan/siaran-pers/Pages/lain.aspx#bagian-2">bagian</a>
    <a href="/id/tentang">navigasi</a>
    <a href="mailto:info@ojk.go.id">email</a>`;

  it("keeps only pattern-matching links, deduped and defragmented", () => {
    const links = extractLinks(
      markup,
      "https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/",
      "/siaran-pers/Pages/[^\"']+\\.aspx",
    );
    expect(links.map((l) => l.link)).toEqual([
      "https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/RDKB-Agustus-2026.aspx",
      "https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/lain.aspx",
    ]);
    expect(links[0].title).toBe("RDKB Agustus 2026");
  });

  it("falls back to a readable tail when the link carries no text", () => {
    const links = extractLinks(
      `<a href="/download/rule/123/peraturan-bpom-nomor-5-tahun-2026.pdf"><img src="i.png"/></a>`,
      "https://jdih.pom.go.id/",
      "/download/rule/\\d+/",
    );
    expect(links[0].title).toContain("peraturan-bpom-nomor-5-tahun-2026");
  });
});
