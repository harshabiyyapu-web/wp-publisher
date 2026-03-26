# Test Strategy

## Unit Tests

### `lib/ai.ts` — `parseAiResponse()`
Verify the parser correctly extracts all fields from a mock Grok response string.
Test cases:
- Normal response with all fields
- Missing SLUG (should default to empty string)
- Missing TAGS (should return empty array)
- Title with markdown bold (**) → should be stripped
- Content without CONTENT: label (fallback mode)

### `lib/scraper.ts` — `scrapeUrl()`
Use a local mock HTML server or test with a known stable URL.
Test cases:
- OG title extraction
- OG image extraction
- Fallback to `<title>` tag when no OG title
- Relative image URL resolution → absolute
- Logo/icon URL filtering (should return null imageUrl)
- Content selector fallback (article → .entry-content → body)

### `lib/prompt.ts` — `getLanguagePrompt()`
- Verify `{{title_instruction}}` is substituted
- Verify `{{target_language}}` is substituted for custom prompts
- Verify preserve_title override prefix is always present
- Test each language key maps to correct display name

### `lib/queue.ts` — `runWithConcurrency()`
- 10 tasks with max 2 concurrent → never more than 2 active at once
- All tasks complete → results array has length 10
- Failed tasks are captured in QueueResult.error, don't stop queue

## Integration Tests

### `POST /api/publish`
Mock the `rewriteWithGrok` and `publishToWordPress` functions.
Verify:
- SSE events streamed for each site
- `type: "success"` event contains `permalink` and `siteName`
- `type: "complete"` event sent at end
- PubJob records created in DB with correct status
- 5 concurrent limit respected

### `POST /api/sites`
- Creates site in DB
- Returns 400 if name/url/token missing
- Strips trailing slash from URL

### `POST /api/settings`
- Saves grok_api_key
- `GET /api/settings` masks grok_api_key as "••••••••"

## E2E Tests (Playwright)

1. Load homepage → Publisher page visible
2. Add site via /sites → site appears in list
3. Test Connection → shows green "✓ OK"
4. Create group → assign site
5. Publisher: paste URL, select site, click Publish
6. Wait for SSE log → see "✓ [sitename] https://..."
7. History page → shows entry → click row → see per-site links
8. Copy all links → clipboard has one URL per line

## Manual Verification Checklist (before deploy)
- [ ] `npm run build` succeeds (0 TypeScript errors)
- [ ] Test Connection on a real WP site returns green
- [ ] Publish one URL to one site → permalink loads correctly
- [ ] Publish same URL to 6 sites → verify 5 start immediately, 6th queues
- [ ] Published post title matches source title exactly (preserve_title)
- [ ] History shows correct permalink with timestamp
- [ ] Copy all links → pasted text has one URL per line
- [ ] Draft post is not publicly visible; Publish post is live

---

## Bug Log
*Document fixed bugs here: date, symptom, root cause, fix.*

| Date | Symptom | Root Cause | Fix |
|---|---|---|---|
| 2026-03-26 | Coolify build fails: `prisma generate` exit code 1 | `app/generated/prisma` was in `.gitignore` — Coolify builds from a fresh git clone so the folder never exists | Removed from `.gitignore`, committed generated client; removed `npx prisma generate` from Dockerfile |
| 2026-03-26 | 502 Bad Gateway after deploy | `output: "standalone"` in `next.config.ts` breaks native `better-sqlite3` bindings — the compiled `.so` can't load in the standalone runner | Removed `output: standalone`; Dockerfile now copies full `node_modules` and starts with `next start` |
| 2026-03-26 | All DB queries fail: `Table 'main.Site' does not exist` | Container starts with empty `/data/dev.db` — Prisma never created tables | Added `entrypoint.sh` that runs `prisma db push` before starting the server |
| 2026-03-26 | `prisma db push` fails silently in container | `datasource db` in schema had no `url` field — Prisma CLI didn't know which file to target | Added `url = env("DATABASE_URL")` to schema; hardcoded `DATABASE_URL=file:/data/dev.db` in `entrypoint.sh` |

## Coolify Deployment Checklist
- [ ] `app/generated/prisma/` is committed (not gitignored) — otherwise Coolify build fails
- [ ] `next.config.ts` does NOT have `output: "standalone"` — breaks better-sqlite3 native bindings
- [ ] `entrypoint.sh` runs `prisma db push` before `next start` — initializes empty SQLite volume
- [ ] `datasource db` in `prisma/schema.prisma` has `url = env("DATABASE_URL")` — required by Prisma CLI
- [ ] Docker volume `wp_db_data` is mounted at `/data` — persists DB across redeploys
- [ ] No env vars required in Coolify — `lib/db.ts` auto-detects production path `/data/dev.db` via `NODE_ENV`
