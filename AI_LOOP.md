# AI_LOOP.md — GigGauge

Project adapter for the AI feature-development loop (`/ai-spec`, `/ai-build`, `/ai-review`, `/ai-status`).

Last refreshed: 2026-07-30 by `/ai-bootstrap`.

## Project

- **Name:** GigGauge
- **Tagline:** Know what your work is really worth.
- **Purpose:** A mobile-first financial planning web application that helps users calculate how much they need to earn to reach a personal income target, and compare employed, self-employed, contracting and gig-work arrangements on a like-for-like basis (after expenses, tax and unpaid time off).

## Repository status — IMPORTANT

The project was scaffolded by issue #1 (Vite + React + TypeScript strict, npm). The commands in the table below are confirmed and must be run for any change. There are still **no CI workflows** — missing CI must not be treated as passing CI.

- Local branch: `main`. Remote: `origin → https://github.com/JAOS-DEV/GigGauge.git`.

## Technology stack (planned, per approved product brief)

- React + TypeScript (strict mode)
- Vite (build tool and dev server)
- React Router
- Tailwind CSS
- Lucide React (icons)
- Recharts (charts)
- React Hook Form + Zod (forms and validation)
- Vitest (unit tests)
- ESLint + Prettier
- localStorage persistence for the MVP (no backend, no Firebase unless a feature genuinely requires it)
- PWA (web manifest, offline shell, installable)
- Deployment target: Vercel

## Package manager

- **Planned:** npm (no lockfile exists yet to confirm otherwise). If scaffolding introduces a different manager (pnpm/yarn/bun), update this section and use the lockfile as the source of truth.

## Default branch

- `main` (local; the remote has no default branch yet because it has no commits).

## Commands

| Task                 | Command                                       | Status    |
| -------------------- | --------------------------------------------- | --------- |
| Install dependencies | `npm install`                                 | Confirmed |
| Local development    | `npm run dev` (Vite, `http://localhost:5173`) | Confirmed |
| Lint                 | `npm run lint` (ESLint)                       | Confirmed |
| Type-check           | `npm run typecheck` (`tsc -b`)                | Confirmed |
| Automated tests      | `npm run test` (Vitest)                       | Confirmed |
| Production build     | `npm run build` (`tsc -b && vite build`)      | Confirmed |

## CI checks

- **None configured.** There are no GitHub Actions workflows. Missing CI must not be treated as passing CI. If CI is added later, list the required checks here.

## Architecture (planned)

Key principles from the approved product brief:

- **Calculation engine must be pure TypeScript, completely separate from UI components**, under `src/calculations/` (periods, expenses, income, comparisons, reverse target solvers, and a tax engine under `src/calculations/tax/` with per-tax-year config files).
- Generic typed scenario model (`GigGaugeScenario`) and result model (`ScenarioResult`) with a `schemaVersion` for localStorage migrations.
- Suggested routes: `/` (dashboard), `/plan`, `/compare`, `/time-off`, `/costs`, `/tracker`, `/scenarios`, `/about`.
- Mobile-first UI: bottom navigation on mobile, sidebar/top navigation on desktop; responsive down to 320px.
- British English and GBP by default via `Intl.NumberFormat` (`en-GB`); currency/tax-region/tax-year kept extensible.

## Persistence and database

- **localStorage only** for the MVP (saved scenarios, latest unsaved state, optional earnings tracker). Schema-versioned for future migrations.
- No database. No Firebase in the MVP; the architecture should keep the door open for optional accounts/cloud sync later.

## Authentication

- **None.** The complete core calculator must work anonymously without a backend.

## Deployment and preview

- **Target:** Vercel (not yet connected). No environment variables are required for the MVP; add `.env.example` only if variables become necessary.

## Important user journeys (manual/browser verification)

Once features exist, verify these journeys in a browser:

1. Quick estimate: choose work-arrangement type, set a take-home target, enter working weeks/days/hours and a main cost, see period breakdowns and required gross income/revenue.
2. Detailed plan: complete goal → work pattern → income → costs → tax sections and reach the results dashboard with the status banner (achieved / narrowly / not achieved / insufficient information).
3. Compare two or three saved scenarios side by side.
4. Time-off planner: change working weeks and see required weekly/daily/hourly targets update; apply a row to the active scenario.
5. Saved scenarios: save, rename, duplicate, delete, export/import JSON; state survives a page reload (localStorage).
6. Mobile check: 320px width, no horizontal scrolling, inputs at least 16px text (no iPhone zoom), bottom navigation usable.
7. PWA (once implemented): manifest present, app installable, offline shell loads.

## Browser testing

- Local browser testing is possible once the Vite dev server exists (`npm run dev`, expected `http://localhost:5173`). No credentials or seed data are needed — the app is anonymous and localStorage-backed.

## Protected or high-risk files and behaviours

- `src/calculations/**` (once created) — the calculation and tax engine. Changes here require passing unit tests; never alter tax rates/thresholds outside the tax-year config files without an approved specification.
- Tax correctness claims: the app must present results as **estimates**, keep the tax disclaimer visible, and never claim unsupported regions (e.g. Scottish Income Tax, if unimplemented) are accurate.
- localStorage schema: any change to persisted shapes must bump `schemaVersion` and provide a migration; never silently discard user data.
- `AI_LOOP.md`, `.cursor/rules/ai-loop-governance.mdc`, `docs/ai-loop/README.md` — workflow files; do not modify during feature work except to keep commands accurate after scaffolding.

## Checks that are unavailable or not configured

- Lint, type-check, tests, build: configured (see Commands above).
- CI: none.
- Deployment previews: not connected.

## Project-specific instructions for agents

- Read this file before specification, implementation or review work.
- The first build task should scaffold the project (Vite + React + TypeScript strict) and wire up all commands above, then update this file's command table to "Confirmed".
- Follow the MVP order from the product brief: calculation engine → tax engine → unit tests → scenario state/persistence → quick estimate → detailed plan → results dashboard → comparison → time-off planner → saved scenarios → earnings tracker → PWA/polish. Do not create every route with placeholder content up front.
- Keep calculations pure, fully unit-tested, precision-retained internally, rounded only for display. No `NaN`, no `Infinity`, no divide-by-zero, no unbounded solver output.
- Use British English, GBP via `Intl.NumberFormat` — never manually concatenate "£".
- Neutral, platform-agnostic language; gig platforms (Uber, Bolt, Deliveroo, etc.) may appear only as optional example templates without their branding.
