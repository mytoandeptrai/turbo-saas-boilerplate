# Technology Choices

Decisions worth explaining. Each section is a compressed ADR: **Context** (what we were solving), **Decision** (what we picked), **Trade-offs** (what we gave up).

The overall stance: **lean toward modern, type-first, Rust-powered tooling; avoid layers of abstraction that don't pay rent.**

- [Prisma ORM](#prisma-orm)
- [Base UI over Radix](#base-ui-over-radix)
- [DDD as opt-in per context](#ddd-as-opt-in-per-context)
- [oxlint + oxfmt over ESLint + Prettier](#oxlint--oxfmt-over-eslint--prettier)

## Prisma ORM

### Context

We need a TypeScript ORM that works with PostgreSQL, gives us type-safe queries, and plays well with a monorepo where the schema lives in a shared package (`@workspace/database`).

### Decision

**Prisma**, with `schema.prisma` and migrations under `packages/database/prisma/`. NestJS injects `PrismaService` (extends `PrismaClient`).

```prisma
enum UserRole {
  ADMIN
  USER
  @@map("user_role")
}

model User {
  id    String   @id
  email String
  role  UserRole @default(USER)
  // ...
  @@map("users")
}
```

`RoleType = UserDatabase['role']` still derives from the generated Prisma `User` model / `UserRole` enum.

### Trade-offs

- Requires `prisma generate` (and rebuilding `@workspace/database`) after schema changes.
- Full-text search (`tsvector`) uses `Unsupported` + `$executeRaw` / `$queryRaw`.
- Query engine is a separate binary (Prisma Client + engine); Studio and ecosystem tooling are mature.

## Base UI over Radix

### Context

We need a headless component library for the admin panel: accessible primitives (dialogs, menus, popovers, ...) without baked-in styling. shadcn/ui is the distribution model we want (copy components into the repo, customize freely).

### Decision

**`@base-ui/react`** as the primitive layer, with shadcn components generated from the **`base-vega`** registry (`packages/ui/components.json` → `"style": "base-vega"`).

### Why not Radix

Radix is the more mature choice, but Base UI is where **Floating UI / Radix's original authors are actively investing**. Base UI's APIs are more consistent (one mental model: controlled props + `render` for composition), and the project sidesteps a Radix API awkwardness we'd rather not inherit: `asChild`.

### The `asChild` change

Radix offers `asChild` to merge a primitive's behavior onto a custom child:

```tsx
// Radix
<DropdownMenu.Trigger asChild>
  <Button variant="ghost">Open</Button>
</DropdownMenu.Trigger>
```

Base UI uses a **`render` prop** instead:

```tsx
// Base UI (this codebase)
<DropdownMenu.Trigger render={<Button variant="ghost">Open</Button>} />
```

Mechanically similar, subtly different:

- `asChild` is prop-merging magic — it looks like a wrapper but silently hijacks props. Forgetting `asChild` silently renders a nested `<button><button>`.
- `render` is explicit — you hand a React element to the primitive and it clones it with the right props. Impossible to forget.

### Trade-offs

- **Every `asChild` in third-party copy-paste examples needs translation**. shadcn-radix examples don't work directly. Our `.claude/rules/admin-shadcn.md` calls this out. The upside: components from `packages/ui/` are internally consistent.
- **Smaller community** than Radix. Issues close slower; fewer recipes on Stack Overflow.
- **`base-vega` shadcn registry is community-maintained**. If it stagnates, we lose the easy `shadcn add` experience. Mitigation: we could fork the registry locally — the CLI is not load-bearing.

### Verdict

Base UI is where the ecosystem is heading. Accepting the `asChild` → `render` translation cost now beats fighting Radix's quirks forever.

## DDD as opt-in per context

### Context

DDD is a powerful toolkit, but forcing every `modules/*` context to have `domain/aggregates/` + `value-objects/` + `events/` produces ceremony without value for simple CRUD. On the other hand, not using DDD at all means complex business rules (order state machines, optimistic locking, invariants across fields) leak into services and controllers where they rot.

### Decision

**Per-context opt-in.** A context gets a `domain/` layer **only when it needs one.**

The split in this repo:

- `todo` — no `domain/`. Service talks to repository port directly.
- `auth` — `domain/events/` only. Events drive audit logging; no aggregates needed (Better Auth owns the state).
- `identity` — minimal `domain/events/`. Better Auth handles business rules; identity context is a persistence gateway.
- `article` — full DDD. Aggregate root, value objects, events.
- `order` — full DDD with the works: aggregate with state machine, `Money` and `OrderItem` value objects, four domain events (created/paid/shipped/cancelled), optimistic locking via `#version`.

### Trade-offs

- **Inconsistency** — a developer reading `todo` will see a different shape than `order`. We treat this as a **feature**: the shape *is* the signal that says "this context has real invariants; tread carefully."
- **Risk of premature promotion** — someone adds a `domain/` layer before it's warranted. Mitigated by the rule: **start anemic, promote when state transitions get non-trivial.**
- **Risk of late promotion** — a context grows complex and invariants leak into services. Mitigated by code review: if a service has state-machine `switch` statements, the aggregate should own them.

### Verdict

"DDD everywhere" is cargo-cult. "No DDD ever" is debt-accumulation. Opt-in per context is the honest middle ground and matches the MVP-first principle in the constitution.

## oxlint + oxfmt over ESLint + Prettier

### Context

A TypeScript monorepo needs a linter and a formatter. ESLint + Prettier is the default; both are Node.js-based, both have grown slow on large repos.

### Decision

**oxlint** (linter) + **oxfmt** (formatter) — both Rust-based tools from the [Oxc](https://oxc.rs) project. Configured via `@infra-x/code-quality` presets (an internal package that ships shared rule bundles).

Each package has its own tightly-scoped config:

```ts
// packages/ui/oxlint.config.ts
import { base, depend, unicorn } from '@infra-x/code-quality/lint'

export default defineConfig({
  extends: [base(), unicorn(), depend()],
  rules: { 'no-shadow': 'off' }, // shadcn-generated code shadows freely
})
```

No `.eslintrc*`, no `.prettierrc*` — fully migrated.

### Why not ESLint + Prettier

- **Speed**. oxlint benchmarks at 50–100× ESLint on TypeScript. On this repo the difference between "I'll wait" and "done before my hand leaves the keyboard."
- **Single toolchain for lint + format**. oxlint and oxfmt share parsing infrastructure; they don't disagree about what is code.
- **One config per package**, driven by framework-specific presets (`unicorn`, `depend`, React, Next.js, Tailwind, Vitest). Presets live in `@infra-x/code-quality` — add a rule once, every package inherits.

### Trade-offs

- **Smaller rule catalog**. oxlint covers the popular ESLint rules but not every plugin. If we need a niche check (say, `eslint-plugin-boundaries`) we'd fall back to ESLint for that package or write our own.
- **Ecosystem lock-in to `@infra-x/code-quality`**. That's an internal package. If it stops being maintained, we'd need to fork or migrate. Acceptable because the configs are small.
- **Editor integration is younger**. The oxlint VS Code extension is good but less battle-tested than ESLint's. Fine for an adopter; annoying for someone who expects 2015-era ESLint polish.

### Verdict

Speed compounds. Every PR saves seconds on lint; every CI run saves minutes. The rule-catalog gap is real but closing fast, and when we hit one we can mix in ESLint for that package without rewriting the world.

## One-Line Summary

- **Prisma** — typed client from `schema.prisma`; Nest injects `PrismaService`
- **Base UI** — explicit composition over implicit magic
- **DDD opt-in** — ceremony only where invariants demand it
- **oxlint** — speed compounds; Rust toolchain is the future
