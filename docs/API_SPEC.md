# API Specification

## Dashboard API Routes

### Sites

#### `GET /api/sites`
Returns all sites with their group.
```json
[
  {
    "id": 1, "name": "My Blog", "url": "https://myblog.com",
    "token": "...", "language": "english", "groupId": 2,
    "group": { "id": 2, "name": "India Hindi", "color": "#6366f1" }
  }
]
```

#### `POST /api/sites`
Create a site.
```json
// Request
{ "name": "My Blog", "url": "https://myblog.com", "token": "abc123", "groupId": 2, "language": "hindi" }
// Response 201
{ "id": 1, "name": "My Blog", ... }
```

#### `PUT /api/sites/:id`
Update a site. Same body as POST.

#### `DELETE /api/sites/:id`
Delete a site. Response: `{ "ok": true }`

#### `POST /api/sites/:id/test`
Test connection to a WP site.
```json
// Response (success)
{ "ok": true, "siteName": "My WordPress Blog" }
// Response (failure)
{ "ok": false, "error": "Connection failed: timeout" }
```

---

### Groups

#### `GET /api/groups`
Returns all groups with their sites (id, name only).

#### `POST /api/groups`
```json
// Request
{ "name": "India - Hindi", "geography": "South Asia", "color": "#6366f1" }
// Response 201
{ "id": 1, "name": "India - Hindi", ... }
```

#### `PUT /api/groups/:id` / `DELETE /api/groups/:id`
Standard update/delete.

---

### Settings

#### `GET /api/settings`
```json
{ "grok_api_key": "••••••••", "custom_prompt": "", "dashboard_password": "" }
```
Note: `grok_api_key` is masked in GET response. Send a new value in POST to update it.

#### `POST /api/settings`
```json
// Request — only include keys you want to update
{ "grok_api_key": "sk-or-v1-...", "custom_prompt": "Rewrite in {{target_language}}..." }
// Response
{ "ok": true }
```

---

### History

#### `GET /api/history?page=1&limit=20`
```json
{
  "articles": [
    {
      "id": 1,
      "sourceUrl": "https://source.com/article",
      "scrapedTitle": "Article Title",
      "createdAt": "2026-03-26T10:00:00Z",
      "pubJobs": [
        {
          "id": 1, "status": "success", "permalink": "https://site1.com/article-slug/",
          "wpPostId": 123, "error": null, "createdAt": "...",
          "site": { "id": 1, "name": "Site 1", "url": "https://site1.com", "group": {...} }
        }
      ]
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### Publish (SSE)

#### `POST /api/publish`
Starts a publish job. Returns an SSE stream.

**Request body:**
```json
{
  "sourceUrls": ["https://source.com/article-1", "https://source.com/article-2"],
  "siteIds": [1, 2, 3, 4, 5, 6],
  "status": "draft",
  "language": "english"
}
```

**Response:** `Content-Type: text/event-stream`

**SSE Event types:**

```
data: {"type":"scraping","url":"https://source.com/article-1"}

data: {"type":"scraped","url":"https://source.com/article-1","title":"Article Title"}

data: {"type":"rewriting","siteId":1,"siteName":"Site 1","url":"https://source.com/article-1"}

data: {"type":"success","siteId":1,"siteName":"Site 1","permalink":"https://site1.com/article-slug/","postId":456,"sourceUrl":"https://source.com/article-1"}

data: {"type":"error","siteId":2,"siteName":"Site 2","error":"HTTP 403: Invalid token","sourceUrl":"https://source.com/article-1"}

data: {"type":"complete","totalSuccess":5,"totalFail":1}
```

**Error responses (non-SSE):**
- `400` — missing `sourceUrls` or `siteIds`
- `400` — Grok API key not configured

---

## WordPress Plugin Endpoint Spec

Installed as part of `claude-content-rewriter.php` on each WP site.

### `GET /wp-json/ccr/v1/health`
Verify connectivity. Requires `X-CCR-Token` header.
```json
// Response 200
{ "status": "ok", "site": "My Blog", "url": "https://myblog.com", "wp_ver": "6.7", "timezone": "Asia/Kolkata" }
// Response 403
{ "code": "bad_token", "message": "Invalid token." }
```

### `POST /wp-json/ccr/v1/publish`
Requires `X-CCR-Token` header.

**Request body:**
```json
{
  "title": "Exact Source Title Here",
  "content": "<p>Full rewritten HTML content...</p>",
  "slug": "url-friendly-slug",
  "meta_description": "SEO meta under 155 chars",
  "focus_keyword": "main keyword",
  "tags": ["tag1", "tag2", "tag3"],
  "category_id": 5,
  "author_id": 1,
  "image_url": "https://source.com/image.jpg",
  "status": "draft"
}
```

**Response 200:**
```json
{ "success": true, "post_id": 789, "permalink": "https://myblog.com/exact-source-title-here/", "status": "draft", "site": "https://myblog.com" }
```

**Error responses:**
- `400` — missing `title` or `content`
- `403` — bad or missing token
- `500` — WP `wp_insert_post()` failure

### `POST /wp-json/ccr/v1/generate-token`
Requires WP admin login (cookie auth). No token header needed.
Generates and stores a new 64-char hex token in WP options (`ccr_publish_token`).
```json
// Response 200
{ "token": "a1b2c3d4e5f6...64chars" }
```
