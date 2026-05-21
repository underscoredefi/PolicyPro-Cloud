# PolicyPro Cloud — Claude Context

## Project
Vanilla JS life insurance CRM. No framework, no build step. Static files served via Cloudflare Pages.

## Stack
- **Frontend:** HTML/CSS/Vanilla JS (no npm, no bundler)
- **Auth:** Supabase Auth (email/password)
- **Database:** Supabase PostgreSQL
- **Deployment:** Cloudflare Pages (`wrangler.toml`)
- **Dev server:** Python HTTP on port 3000 (`.claude/launch.json`)

## Supabase
- **Project ref:** `qhqhqhqkgwlhuuloymvz`
- **URL:** `https://qhqhqhqkgwlhuuloymvz.supabase.co`
- **Anon key:** in `js/config.js`
- **Schema:** single `crm_data` table — `(id UUID, user_id UUID, section TEXT, data JSONB, updated_at TIMESTAMPTZ)`
- **Sections:** `prospects`, `clients`, `callers`, `callhistory`, `pipeline`, `tasks`
- **RLS:** enabled — users can only access rows where `auth.uid() = user_id`

## Key Files
| File | Purpose |
|------|---------|
| `js/config.js` | Supabase client init (`window.supabaseClient`) |
| `js/db.js` | Cache-first sync layer — `ld(section)` read, `sv(section, records)` write |
| `js/app.js` | App state, navigation, section switching |
| `js/modal.js` | Form field schemas (`FIELD_KEYS`), modal open/close |
| `js/render.js` | Grid/list/kanban view renderers |
| `js/utils.js` | Formatting helpers |
| `index.html` | Auth entry point (login/signup) |
| `app.html` | Main CRM interface |

## Sync Pattern
Cache-first. Reads are synchronous from `_cache`. Writes go to cache immediately, sync to Supabase async in background. Sync = upsert all + delete removed rows (last-write-wins, no conflict detection).

## Known Issues
- SSN stored plaintext in JSONB — HIGH priority fix (encrypt client-side)
- No server-side schema validation — JSONB allows any shape
- No offline fallback — requires Supabase on every load

## Git
Remote: `https://github.com/underscoredefi/PolicyPro-Cloud.git`

## When Using Supabase MCP
Always use project ref `qhqhqhqkgwlhuuloymvz` in MCP tool calls.
If MCP returns "re-authorization required" → run `mcp__supabase__authenticate`.
