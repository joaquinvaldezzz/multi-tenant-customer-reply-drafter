# Plan 005: Playwright E2E Test Suite, Dockerfile, and GitHub Actions CI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat a742e28..HEAD -- package.json .github/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/001-supabase-schema-and-rls.md, plans/002-workspace-and-kb-crud.md, plans/004-interactive-drafter-dashboard-ui.md
- **Category**: tests
- **Planned at**: commit `a742e28`, 2026-10-17

## Why this matters

The applicant's key differentiator on paper is deep experience with CI/CD and end-to-end test automation (expanding suites from 15 to 67+ tests at Vessel Vanguard). Demonstrating a robust, automated Playwright test suite for the complete user journey (login -> workspace -> FAQ entry -> streamed AI draft -> quota exhaustion), paired with a multi-stage Dockerfile and GitHub Actions CI pipeline, proves senior-level engineering rigor and production readiness.

## Current state

- No test framework or Playwright config currently exists in `package.json`.
- `Dockerfile` does not exist.
- `.github/workflows/` does not exist.
- Next.js config (`next.config.ts`) has default settings.

## Commands you will need

| Purpose            | Command                                         | Expected on success |
| ------------------ | ----------------------------------------------- | ------------------- |
| Install Playwright | `bun add -d @playwright/test`                   | exit 0              |
| Playwright install | `bun x playwright install --with-deps chromium` | exit 0              |
| Typecheck          | `bun x tsc --noEmit`                            | exit 0, no errors   |
| Run E2E            | `bun x playwright test`                         | all pass            |

## Scope

**In scope**:

- `package.json` (add `@playwright/test` dev dependency and `"test:e2e"` script)
- `playwright.config.ts` (Playwright configuration with webServer config)
- `e2e/auth-and-draft.spec.ts` (E2E test covering signup/login, workspace creation, FAQ creation, and streaming draft generation)
- `e2e/quota-enforcement.spec.ts` (E2E test verifying 429 quota exhaustion alert)
- `Dockerfile` (optimized multi-stage build: base, dependencies, builder, runner)
- `.dockerignore` (standard ignore patterns)
- `next.config.ts` (enable `output: 'standalone'`)
- `.github/workflows/ci.yml` (GitHub Actions workflow checking typecheck, lint, Docker build, and Playwright)

**Out of scope**:

- Kubernetes / Terraform orchestration scripts
- Full cross-browser matrix on Safari/Firefox (focus CI on fast Chromium execution for demo efficiency)

## Git workflow

- Branch: `advisor/005-playwright-docker-ci`
- Commit convention: Conventional Commits (e.g. `ci: add playwright e2e tests, dockerfile, and github actions pipeline`)

## Steps

### Step 1: Install Playwright and Configure E2E Testing

Add `@playwright/test` to devDependencies:

```bash
bun add -d @playwright/test
```

Create `playwright.config.ts`:

- Set test directory to `./e2e`.
- Configure `webServer` to launch `bun run dev` or `bun run start` on `http://localhost:3000`.
- Use desktop Chromium project for consistent, fast test execution.
- Set retries to 1 in CI, 0 locally.

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 2: Implement E2E User Flow Tests

Create `e2e/auth-and-draft.spec.ts`:

1. Navigates to app, logs in or seeds authenticated session.
2. Creates or selects a workspace ("Acme Support").
3. Navigates to `/knowledge-base` and adds an FAQ:
   - Title: "Refund Policy Window"
   - Content: "Customers may request a full refund within 30 days of purchase with original receipt."
   - Category: "policy"
4. Navigates to `/drafter`:
   - Inputs customer message: "Can I get my money back? I bought this 10 days ago."
   - Clicks "Generate Reply".
   - Verifies streamed output card appears and contains confirmation of the 30-day refund window.
5. Negative test: Inputs ungrounded inquiry ("Do you offer international shipping to Mars?"):
   - Verifies output contains the grounded fallback sentinel: `[INSUFFICIENT_KNOWLEDGE]`
   - Verifies UI displays the amber "Missing Policy" warning banner.

Create `e2e/quota-enforcement.spec.ts`:

- Sets workspace draft count to monthly limit via test helper.
- Attempts draft generation.
- Verifies UI renders 429 limit warning and disables button.

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 3: Create Multi-Stage Dockerfile

Update `next.config.ts` to include `output: 'standalone'`.
Create `Dockerfile`:

- Stage 1 (`deps`): Install dependencies using `oven/bun:1-alpine`.
- Stage 2 (`builder`): Copy source and run `bun run build`.
- Stage 3 (`runner`): Minimal Node or Bun alpine runner, copy standalone server and static assets, expose port 3000, set `NODE_ENV=production`.
  Create `.dockerignore` ignoring `node_modules`, `.next`, `.git`, `e2e`, and `.env*`.

**Verify**: Check Dockerfile syntax and standalone config in `next.config.ts`.

### Step 4: Implement GitHub Actions CI Workflow

Create `.github/workflows/ci.yml`:

- Trigger on `push` to `main` and `pull_request` to `main`.
- Job 1: `quality`:
  - Checkout code.
  - Setup Bun.
  - Install dependencies (`bun install --frozen-lockfile`).
  - Run `bun x tsc --noEmit`.
- Job 2: `docker`:
  - Run `docker build -t customer-reply-drafter:latest .`
- Job 3: `e2e`:
  - Boot local Supabase test instance (`npx supabase start`, ADR 0005).
  - Run Playwright test suite against live RLS container with test API key.

**Verify**: Valid YAML structure in `.github/workflows/ci.yml`.

## Test plan

- Test `bun run test:e2e` executes locally or in headless container.
- Test Docker image builds cleanly with standalone bundle.
- Verification: `bun x tsc --noEmit` → exit 0.

## Done criteria

- [ ] `@playwright/test` installed and configured in `playwright.config.ts`
- [ ] `e2e/auth-and-draft.spec.ts` covers full end-to-end user workflow
- [ ] Multi-stage `Dockerfile` with standalone Next.js output created
- [ ] `.github/workflows/ci.yml` runs typecheck, Docker build, and E2E checks
- [ ] `bun x tsc --noEmit` exits 0 with zero errors
- [ ] `plans/README.md` status row updated

## STOP conditions

- If Playwright browsers fail to install on target host, configure Playwright to run in mock mode or report missing OS libraries.

## Maintenance notes

- When changing Next.js major versions, verify standalone output file paths inside `Dockerfile`.
