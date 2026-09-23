<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Where this app runs

Catalyst is deployed to Cloud Run in Google Cloud project `ada-sectors-508410` as the service
`catalyst-web` in `us-central1`, live at https://catalyst-web-ibyebnreqa-uc.a.run.app.

Read `docs/DEPLOY.md` before deploying, before changing environment variables or secrets, and
before answering any question about where the app runs, where its data is stored, or where to read
its logs. It is the only document in this repository that is verified against the live project;
the plans under `docs/` describe intent at the time they were written and drift from what exists.

Nothing ships because a branch was pushed — there is no CI trigger on the repository.
One job does deploy without a human: the scheduled data refresh in `cloudbuild-refresh.yaml`,
which re-records the Sectors feeds each trading day, rebuilds the bundle, runs the gate and
deploys only if it passes. See `docs/DEPLOY.md` §10. Every other deploy is a person running
the command.

# No hard-coded values

Nothing a reader sees, and nothing the app decides with, may be typed into the source as a
literal. Every figure comes from the recordings in `lib/data/market.generated.ts`, every
threshold from `DEFAULT_THRESHOLDS` in `lib/agent/thresholds.ts`, every citation from the registry
in `lib/data/fixtures.ts`, and every sentence that interprets those figures is written at request
time by the model from that same material.

This is not a style preference. A literal in the source is a claim nobody re-checks: it survives
a data refresh, contradicts the pillar above it when a threshold moves, and fails silently —
tests still pass while the screen states something the recordings never said. A hand-kept table
of prose per feed also rots by omission, because adding a feed is not what breaks it.

Specifically, do not:

- write a number a reader will see (price, volume, share, ratio, count, date, window) as a literal
  in a component, a route, or a helper — compute it from the recordings;
- write a verdict, interpretation, or explanation sentence per case, per feed, or per metric —
  hand the measurements to the model (`lib/agent/llm/*`) and let it write the sentence, verified;
- re-type a threshold, floor, or cut-off that `lib/agent/thresholds.ts` already holds, or invent a
  new one at a call site — add it to that table, where its provenance is recorded;
- keep a per-endpoint, per-symbol, or per-sector lookup table of English or Indonesian prose;
- hard-code a symbol, sector, endpoint, or field name outside `lib/data/fixtures.ts`, which is the
  registry everything else derives from.

What may be a literal: structural UI copy that is true of every case (a heading, a button label,
an empty state), field labels, format strings, and the threshold table itself.

That copy is still indexed. `scripts/build-chrome-registry.mjs` reads every heading, eyebrow,
description, action label and `aria-label` region out of the JSX in `app/` and `components/` and
writes `lib/data/chrome.generated.ts`, which the assistant retrieves from — so a reader can ask
what a panel on screen means and be answered about that panel rather than about whichever
recording happened to share two of its words. Run `npm run chrome:build` after changing any of
that copy; `tests/chrome-registry.test.ts` fails when the file is stale. Do not hand-edit it, and
do not write a per-heading explanation: the block's words are paired with its page's bundle
(`lib/agent/retrieval/context/`) and the model writes the sentence from both.

Every page a reader can open needs a bundle in `lib/agent/retrieval/context/` registered in
`VIEWS` (`lib/agent/retrieval/context/index.ts`). A page without one can only have its own words
read back to it. Pages that exist only to redirect have nothing of their own to say and are
covered by `tests/retrieval-views.test.ts`.

When a model writes a user-visible sentence it must be verified before it ships — numerals limited
to the material it was given, no invented columns, no trading advice, no symbol names in a
sentence that is cached for every symbol. See `lib/agent/llm/verify.ts` and the guards in
`lib/agent/llm/reading-explain.ts`. A rejected draft renders nothing; the panel never fills a gap
with prose it cannot support.
