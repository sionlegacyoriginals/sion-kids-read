# Sion Kids Read

AI-powered children's story generator that lets parents create personalized, wholesome bedtime stories for their kids in seconds.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/story-app/` — React + Vite frontend (Fraunces serif + Nunito UI, warm cream/gold palette)
- `artifacts/api-server/src/routes/stories/` — Story CRUD + AI generation routes
- `lib/db/src/schema/stories.ts` — Stories table schema
- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/integrations-openai-ai-server/` — OpenAI SDK wrapper

## Architecture decisions

- Story generation uses `gpt-5.6-luna` (cost-efficient for creative text, non-streaming; full story returned in one shot)
- Story title is extracted from the LLM's first line (`TITLE: ...`) to avoid a second API call
- PDF export is client-side via `window.print()` with print-specific CSS — no external library needed
- AI integration uses Replit-managed OpenAI proxy (no user API key required)
- Stats endpoint uses raw SQL aggregations (`count(*)::int`) via Drizzle's `sql` helper

## Product

- **Story creation form** — Child name, age, gender, milestones/details, theme (8 values), custom plot prompt
- **AI story generation** — Personalized 4–6 paragraph bedtime story reinforcing chosen theme/value
- **Story library** — Browse, search and filter all saved stories
- **Story viewer** — Beautiful serif reading view with Regenerate, Edit, and Download PDF actions
- **Dashboard** — Recent stories sidebar + stats (total count, stories by theme)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
