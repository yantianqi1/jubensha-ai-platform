# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm/Turborepo TypeScript monorepo for an LLM-powered murder mystery platform.

- `packages/dsl/src`: deterministic schemas, validation, runtime rules, package simulation, and shared contracts.
- `apps/api/src`: NestJS API modules. Main domains include `creation`, `content`, `runtime`, `generation`, `demo`, and `shadow`.
- `apps/web/src`: static browser shell for `studio-web`, `play-web`, and `admin-web`; build helpers live in `apps/web/scripts`.
- `docs/plans` and `docs/operations`: implementation plans, progress snapshots, and release checklists.
- Tests sit next to code as `*.test.ts`. Build outputs in `dist/`, `.turbo/`, and `node_modules/` are generated artifacts.

## Build, Test, and Development Commands

Run commands from the repository root unless a package filter is shown.

- `pnpm install`: install workspace dependencies.
- `pnpm dev`: run all package dev tasks in parallel.
- `pnpm test`: run all Vitest suites through Turbo.
- `pnpm typecheck`: run TypeScript checks for all workspaces.
- `pnpm build`: build DSL, API, and static web output.
- `pnpm --filter @jubensha/api test -- runtime`: run targeted API tests.
- `pnpm db:up` / `pnpm db:down`: start or stop local Postgres/Redis via Docker Compose.

## Coding Style & Naming Conventions

Use TypeScript ES modules, two-space indentation, explicit exported interfaces, and immutable-first data (`readonly`, object spreads, no parameter mutation). Keep domain logic small and explicit: prefer named helpers over nested conditionals. Use kebab-case filenames such as `theme-asset-job.ts`; use PascalCase for classes and interfaces, camelCase for functions and variables.

## Testing Guidelines

Vitest is the test framework. Add or update colocated `*.test.ts` files for every behavior change. Prefer targeted runs first, then `pnpm test`, `pnpm typecheck`, and `pnpm build` before handoff. Tests should assert explicit failures and structured errors; do not add mock success paths that hide missing integrations.

## Commit & Pull Request Guidelines

Git history uses short conventional prefixes such as `feat:` and `fix:`. Keep commits focused, e.g. `feat: add runtime seat snapshots`. Pull requests should include a concise summary, changed surfaces (`api`, `web`, `dsl`, `docs`), verification commands, linked issue/plan, and screenshots for visible UI changes.

## Security & Configuration Tips

Never commit secrets or provider keys. Use environment variables and explicit unconfigured-provider errors. Avoid silent fallbacks, fake completions, or swallowed exceptions; failures should remain visible in logs, HTTP errors, and UI diagnostics.
