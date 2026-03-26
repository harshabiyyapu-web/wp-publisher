# Architecture Overview

## System Diagram
```
User Browser
    │
    ▼
Next.js Dashboard (VPS :3000)
    │
    ├── GET  article URL ──────────► Source website (scrape HTML)
    │
    ├── POST OpenRouter API ────────► Grok 4.1 Fast
    │         (5 concurrent)              (unique rewrite per site)
    │
    └── POST /wp-json/ccr/v1/publish ► WP Site 1 (token auth)
         (5 concurrent)               ► WP Site 2
                                      ► WP Site N ...
                                           │
                                           ▼
                                      Returns permalink
                                           │
                                    Saved to SQLite DB
```

## Data Flow (one publish job)

1. **User** pastes source URLs + selects sites + clicks Publish
2. **`POST /api/publish`** opens an SSE stream
3. For each source URL:
   - **`lib/scraper.ts`** fetches the URL, extracts title + content + OG image
   - Article record saved to `articles` DB table
4. For each selected site (max 5 concurrent via `lib/queue.ts`):
   - **`lib/ai.ts`** calls Grok 4.1 Fast via OpenRouter
     - Unique rewrite per site (different random seed effectively)
     - Title is ALWAYS preserved exactly (preserve_title mode from plugin)
     - Same prompt structure as original PHP plugin (ported to TypeScript)
   - **`lib/wordpress.ts`** POSTs to `https://site.com/wp-json/ccr/v1/publish`
     - Token auth via `X-CCR-Token` header
     - WP plugin handles: post creation, image download+resize, Rank Math meta
     - Returns `{ post_id, permalink }`
   - `pub_jobs` record saved with permalink + status
   - SSE event streamed to browser: `{ type: "success", siteName, permalink }`
5. After all sites done: `{ type: "complete", totalSuccess, totalFail }`

## Tech Decisions

| Decision | Rationale |
|---|---|
| Next.js App Router | Full-stack in one repo; API routes are edge-ready; SSE works natively |
| SQLite + Prisma | Zero-config, file-based, single-user VPS — no Postgres overhead needed |
| Custom WP REST endpoint | Faster than WP REST API (1 request vs 3); full control over post creation; Rank Math meta; reuses existing image resize code |
| Token auth | `hash_equals()` constant-time comparison; no WP bcrypt overhead of App Passwords |
| SSE (not WebSocket) | Simpler, unidirectional, works through Nginx without upgrade headers |
| 5 concurrent | Balances OpenRouter rate limits with speed; OpenRouter Grok tier allows this |
| Preserve title always | All sites share exact source title (user requirement); unique body avoids duplicate content penalty |

## Database Schema

```
Group        — id, name, geography, color
  └── Site   — id, name, url, token, groupId, language
        └── PubJob — id, articleId, siteId, status, wpPostId, permalink, error

Article      — id, sourceUrl, scrapedTitle
  └── PubJob (same as above)

Setting      — key, value  (grok_api_key, custom_prompt, dashboard_password)
```

## WP Plugin Endpoint

The PHP endpoint `POST /wp-json/ccr/v1/publish` was added to the existing
`claude-content-rewriter.php` plugin. It:
- Verifies `X-CCR-Token` header against `get_option('ccr_publish_token')`
- Calls existing `resize_image_to_strict_dimensions()` for images
- Sets `rank_math_description` and `rank_math_focus_keyword` post meta
- Returns `{ success, post_id, permalink, status, site }`

Token is generated via `POST /wp-json/ccr/v1/generate-token` (requires WP admin login).
