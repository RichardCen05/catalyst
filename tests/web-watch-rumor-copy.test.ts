import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SEED_SOURCES } from "@/lib/web-watch/seeds";

// The Pantau page told readers to look in Terindikasi Rumor for news they had
// seen on social media. No social platform is monitored, so the tab stayed
// empty and read as broken (29 Sep retest). The copy now says the opposite,
// and these keep that sentence true.

const root = process.cwd();
const review = readFileSync(join(root, "components/web-watch-review.tsx"), "utf8");
const bundle = readFileSync(join(root, "lib/agent/retrieval/context/web-watch.ts"), "utf8");

const SOCIAL_HOSTS = /(^|\.)(twitter\.com|x\.com|reddit\.com|instagram\.com|facebook\.com|tiktok\.com|threads\.net|t\.me|youtube\.com|stockbit\.com)$/i;

describe("the rumor tab says where its items come from", () => {
  it("monitors no social platform, so 'media sosial tidak dipantau' stays true", () => {
    const social = SEED_SOURCES.filter((source) => SOCIAL_HOSTS.test(new URL(source.url).hostname));
    expect(social.map((source) => source.id)).toEqual([]);
  });

  it("does not invite the reader to find social-media news in the tab", () => {
    for (const text of [review, bundle]) {
      expect(text).not.toMatch(/Melihat kabar di media sosial|Lihat berita ini di media sosial|diperiksa ulang lewat tab ini/);
    }
  });

  it("counts the monitored sources from the data, not from a literal", () => {
    expect(review).toMatch(/ditandai rumor dari \{data\?\.sources\.length \?\? 0\} sumber yang dipantau/);
  });
});
