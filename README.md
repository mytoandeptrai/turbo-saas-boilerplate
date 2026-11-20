# Turbo SaaS Boilerplate

[![CI](https://github.com/mytoandeptrai/turbo-saas-boilerplate/actions/workflows/ci.yml/badge.svg)](https://github.com/mytoandeptrai/turbo-saas-boilerplate/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/node-22-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10-orange)](https://pnpm.io)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

**A Turborepo monorepo starter for full-stack SaaS** — NestJS API, Next.js admin, shared packages, typed end-to-end.

This is not “a NestJS repo with extras.” Apps and libraries live in one workspace; Turborepo + pnpm orchestrate install, build, lint, and typecheck across the tree.

## What’s inside

| Path | Role |
| --- | --- |
| `apps/api` | NestJS API (Prisma, JWT/OAuth, RBAC, audit, DDD where it pays off) — `:3000` |
| `apps/admin-shadcn` | Next.js App Router admin (shadcn/ui · Base UI, TanStack Query) — `:8080` |
| `packages/database` | Prisma schema, migrations, seed (`@workspace/database`) |
| `packages/api-types` | OpenAPI → TypeScript client types |
| `packages/ui` | Shared UI primitives |
| `packages/icons` | Shared icon set |

## Stack

Turborepo · pnpm · NestJS 11 · Next.js · PostgreSQL · Prisma · Redis · oxlint / oxfmt

## Features

- **Auth & RBAC** — JWT + OAuth (Google / GitHub), role-based access
- **Admin UI** — typed hooks from OpenAPI, form validation, role-aware UI
- **Durable writes & audit** — idempotency keys, ETag optimistic locking, event-driven audit logs
- **Observability** — RFC 9457 problem details, structured logging, request-ID correlation
- **End-to-end types** — Prisma for the DB; OpenAPI for the frontend
- **AI-ready rules** — [`.claude/rules/`](./.claude/rules/) for Cursor / Claude Code (also useful as human onboarding)

## Quick start

```bash
pnpm install
docker compose -f docker/docker-compose.yml up -d    # PostgreSQL + Redis

pnpm --filter @workspace/database build
pnpm --filter @workspace/database db:migrate:deploy  # apply Prisma migrations
pnpm --filter @workspace/database db:seed            # admin@ / user@ example accounts

pnpm dev                                             # API + admin via Turborepo
```

`pnpm install` copies `.env.example` → `.env` for `api`, `admin-shadcn`, and `database`. Force-reset with `pnpm setup:env`.

### Verify

- API health: http://localhost:3000/health
- API docs: http://localhost:3000/api
- Admin: http://localhost:8080

Seed passwords default to `12345678` (`admin@example.com`, `user@example.com`).

## Database (Prisma)

Schema and migrations live in `packages/database/prisma/`.

| Command | Purpose |
| --- | --- |
| `pnpm --filter @workspace/database db:migrate` | Dev: create + apply a migration (commit the SQL) |
| `pnpm --filter @workspace/database db:migrate:deploy` | CI / prod: apply committed migrations |
| `pnpm --filter @workspace/database db:push` | Dev-only schema sync without a migration file |
| `pnpm --filter @workspace/database db:seed` | Seed demo users |
| `pnpm --filter @workspace/database db:studio` | Prisma Studio |

**Deploy mental model:** create migrations locally → commit `prisma/migrations/` → on the host run `db:migrate:deploy` with production `DATABASE_URL` before starting the API. Turborepo does not run migrations for you.

After schema changes, always:

```bash
pnpm --filter @workspace/database db:generate
pnpm --filter @workspace/database build
```

## Common commands

```bash
pnpm dev                 # turbo run dev
pnpm build               # turbo run build
pnpm lint / typecheck
pnpm format              # oxfmt
pnpm --filter api test
pnpm --filter api test:e2e
```

## Documentation

- [Architecture](./docs/architecture.md) — monorepo layout, layering, request lifecycle
- [API Conventions](./docs/api-conventions.md) — URLs, errors, auth, idempotency, locking
- [Technology Choices](./docs/technology-choices.md) — Prisma, Base UI, opt-in DDD, oxlint
- [Contributing](./CONTRIBUTING.md) — setup, workflows, troubleshooting

## License

MIT — see [LICENSE](./LICENSE).
