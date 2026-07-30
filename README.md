# GigGauge

**Know what your work is really worth.**

GigGauge is a mobile-first financial planning web application that helps you calculate how much you need to earn to reach a personal income target, and compare employed, self-employed, contracting and gig-work arrangements on a like-for-like basis — after expenses, tax and time off.

## Status

Early development. This release contains the project scaffold and the pure calculation engine (period conversions, expense annualisation, the UK 2026/27 tax engine and reverse target solvers) with full unit-test coverage. The user-facing calculator flows arrive in subsequent releases.

## Tech stack

- React + TypeScript (strict mode) + Vite
- React Router, Tailwind CSS, Lucide React, Recharts, React Hook Form, Zod
- Vitest, ESLint, Prettier
- localStorage persistence (planned) — no backend, works anonymously

## Getting started

Requires Node.js 20 or later.

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Commands

| Task             | Command              |
| ---------------- | -------------------- |
| Development      | `npm run dev`        |
| Type-check       | `npm run typecheck`  |
| Lint             | `npm run lint`       |
| Tests            | `npm run test`       |
| Tests (watch)    | `npm run test:watch` |
| Production build | `npm run build`      |
| Preview build    | `npm run preview`    |
| Format           | `npm run format`     |

## Architecture

The calculation engine lives in `src/calculations/` and is pure TypeScript with no React or DOM dependencies:

```
src/calculations/
  types.ts           Domain types (scenario and result models)
  validation.ts      Zod schemas and CalculationInputError
  periods.ts         Period conversions (annual/monthly/weekly/daily/hourly)
  expenses.ts        Expense annualisation and summaries
  income.ts          Profit/loss and income attribution
  scenarioResult.ts  Full scenario result orchestration
  targets/           Reverse solvers (required gross salary / revenue)
  tax/               UK tax engine; all rates live in tax/config/
src/utils/format.ts  GBP/en-GB display formatters
```

All tax rates and thresholds live only in `src/calculations/tax/config/` per tax year and region. Full precision is retained internally; rounding happens only in display formatters.

## Tax estimates — important

> This is an estimate for planning purposes and is not tax or financial advice. Your tax position depends on your personal circumstances. Check current HMRC guidance or speak to a qualified accountant.

Supported: England, Wales and Northern Ireland, tax year 2026/27 (Income Tax, employee Class 1 NI, Class 4 NI, Personal Allowance taper, combined employed + self-employed income).

Not supported or simplified:

- **Scottish Income Tax** is not implemented; Scotland is explicitly reported as unsupported rather than silently using rest-of-UK bands.
- **Student loan repayments** are not included in any calculation.
- Employee pension contributions are modelled as **salary sacrifice** (deducted before Income Tax and NI).
- Self-employed retirement saving is treated as a post-tax allocation with no tax relief.
- Class 2 NI (voluntary from 2026/27) and the Class 1/Class 4 annual-maximum rule are excluded.

## Deployment

The project is Vercel-ready:

1. Import the GitHub repository into [Vercel](https://vercel.com).
2. Vercel auto-detects Vite; the default build command (`npm run build`) and output directory (`dist`) are correct.
3. `vercel.json` contains the SPA rewrite so client-side routes resolve.

No environment variables are required.
