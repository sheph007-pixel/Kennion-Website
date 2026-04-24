<!-- Not loaded by the assistant — filenames starting with README are filtered by convention. -->
# Knowledge base

This directory is loaded by `server/ai-chat.ts` at boot and injected into
the system prompt of the dashboard chat assistant.

Every `*.md` file in this directory becomes part of the assistant's
context. Keep each file short and focused.

## Refreshing from kennionprogram.com

Run the scraper from a dev machine with normal network access:

```bash
npx tsx scripts/scrape-kennion-program.ts
```

It overwrites the generated files and leaves hand-curated ones alone as
long as they use different slugs. Commit the result.

## Hand-curated files

- `about.md` — one-paragraph summary of the Kennion program, what RBP
  means, and the product structure. Kept short on purpose — the plan
  benefits grid and factor tables are already injected separately.
