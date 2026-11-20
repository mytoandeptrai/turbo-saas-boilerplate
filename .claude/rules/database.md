---
paths:
  - packages/database/**
---

# Database Package Rules (`@workspace/database`)

Rules for Prisma schema, migrations, and the package's place in the monorepo.

## Tech Stack

- **ORM**: Prisma
- **Driver**: PostgreSQL via Prisma Client
- **Migrations**: `prisma migrate`
- **Build**: `tsdown` (re-exports + type aliases)
- **Language**: TypeScript (ESM)

## Structure

```
packages/database/
├── prisma/
│   ├── schema.prisma            # Single source of truth for tables/enums
│   └── migrations/              # Prisma migrations
├── src/
│   ├── client.ts                # createPrismaClient helper
│   ├── types.ts                 # Compatibility aliases (UserDatabase, InsertTodo, …)
│   └── index.ts                 # Package entry
└── scripts/
    └── seed.ts
```

## Schema Change Workflow

```bash
# 1. Edit packages/database/prisma/schema.prisma
# 2. Generate client + rebuild package
pnpm --filter @workspace/database db:generate
pnpm --filter @workspace/database build
# 3. Dev: push or migrate
pnpm --filter @workspace/database db:push
#    or: pnpm --filter @workspace/database db:migrate
```

## Rules

- Schema lives only in `prisma/schema.prisma`
- Keep Better Auth–compatible field names on identity tables
- Export type aliases from `src/types.ts` when application code needs Insert/Select shapes
- Rebuild `@workspace/database` before consuming new types in `apps/api`

## Prohibited

- Business logic inside this package
- Hard-coded connection strings in schema or config
- Skipping `prisma generate` / package rebuild before downstream typecheck
