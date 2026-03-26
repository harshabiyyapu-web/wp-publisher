# Git Commit Conventions

## Format
```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

## Types
| Type | When to use |
|---|---|
| `feat` | New feature (new page, new API endpoint, new capability) |
| `fix` | Bug fix |
| `chore` | Tooling, dependencies, config (no production code change) |
| `docs` | Documentation only (CLAUDE.md, docs/*.md) |
| `refactor` | Code restructure without behavior change |
| `perf` | Performance improvement |
| `test` | Test additions or fixes |

## Scopes
- `plugin` — WP plugin (claude-content-rewriter.php)
- `api` — Next.js API routes
- `ui` — React pages/components
- `db` — Prisma schema or migrations
- `lib` — lib/ files (scraper, ai, queue, etc.)
- `deploy` — PM2, Nginx, Docker config

## Examples
```
feat(plugin): add ccr/v1/publish REST endpoint with token auth
fix(api): handle empty content from scraper gracefully
feat(ui): add copy-per-site button to history page
perf(lib): increase publish concurrency from 3 to 5
docs: update API_SPEC with generate-token endpoint
chore(db): add migration for pubJob error column
```

## Branch naming
```
feat/publisher-ui
fix/sse-disconnect-handling
chore/update-prisma-7
docs/api-spec-update
```

## PR checklist
- [ ] `npm run build` passes with no TypeScript errors
- [ ] New API routes documented in `docs/API_SPEC.md`
- [ ] Any fixed bugs added to `docs/TESTING.md` bug log
- [ ] `CLAUDE.md` updated if new files/commands added
