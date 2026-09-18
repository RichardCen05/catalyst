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

Deployment is manual — there is no CI trigger. Nothing ships because a branch was pushed.
