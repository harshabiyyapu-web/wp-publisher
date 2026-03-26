# WP Multi-Site Publisher — Claude Reference

## What this project is
A Next.js 14 dashboard for publishing AI-rewritten articles to 30–50 WordPress sites in parallel.
- AI: Grok 4.1 Fast via OpenRouter (5 concurrent jobs)
- WP connection: custom REST endpoint added to existing `claude-content-rewriter.php` plugin
- Each site gets a **unique** AI rewrite, but the **exact source title** is preserved on all sites

## Reference docs
- @docs/PLAN.md       — Architecture overview and data flow
- @docs/API_SPEC.md   — All API routes (request/response shapes, SSE events, WP endpoint spec)
- @docs/COMMITS.md    — Git commit conventions and PR checklist
- @docs/TESTING.md    — Test strategy and bug log

## Stack
| Layer | Tech |
|---|---|
| Framework | Next.js 14 App Router |
| UI | React + Tailwind CSS |
| Database | SQLite via Prisma 7 + better-sqlite3 adapter |
| AI | OpenRouter API → Grok 4.1 Fast (`x-ai/grok-4.1-fast`) |
| WP connection | Custom REST endpoint on each WP site (`/wp-json/ccr/v1/publish`) |
| Deployment | Node.js + PM2 + Nginx on VPS |

## Key commands
```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm start            # Start production server

npx prisma migrate dev --name <name>   # Create + apply migration
npx prisma generate                    # Regenerate client after schema change
npx prisma studio                      # Browse database in browser
```

## Critical files
| File | Role |
|---|---|
| `lib/ai.ts` | Grok API caller + AI response parser |
| `lib/scraper.ts` | URL scraper (title, content, OG image) |
| `lib/prompt.ts` | Language prompt builder (ports PHP plugin logic) |
| `lib/wordpress.ts` | HTTP client for WP ccr/v1/publish endpoint |
| `lib/queue.ts` | Sliding-window concurrency (max 5) |
| `lib/db.ts` | Prisma client singleton (better-sqlite3 adapter) |
| `app/api/publish/route.ts` | SSE publish engine — orchestrates everything |
| `prisma/schema.prisma` | DB schema |
| `app/(dashboard)/page.tsx` | Main publisher UI |

## WP Plugin file (source of truth for WP side)
```
Multiple-website-publisher/Supports-all-languages/claude-content-rewriter.php
```
The new REST endpoints were added at the bottom of the class.
Run `POST /wp-json/ccr/v1/generate-token` (while logged in as WP admin) to get a site token.

## Environment variables (.env)
```
DATABASE_URL="file:./prisma/dev.db"
```
API keys are stored in the `Setting` DB table (not .env) so they can be changed via the Settings UI.

## Adding a new WP site
1. Install updated `claude-content-rewriter.php` on the WP site
2. Call `POST /wp-json/ccr/v1/generate-token` while logged in as admin → copy the token
3. Go to Sites page → Add Site → paste URL + token + assign group

## Updating the WP plugin on all sites
Replace the `claude-content-rewriter.php` file on each WP site via:
- FTP / SFTP
- ManageWP or MainWP bulk plugin update
- WP-CLI: `wp plugin install /path/to/plugin.zip --force`
