# Plan 007: Job Application Submission Package (OnlineJobs.ph #1750756)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat a742e28..HEAD -- docs/ application/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/006-architecture-docs-and-deployment.md
- **Category**: docs
- **Planned at**: commit `a742e28`, 2026-10-17

## Why this matters

The employer filters candidates strictly at the GitHub and application screening stage. The job posting specifically mandates a GitHub link, 2–3 best full-stack repositories, live demo links, a short AI/LLM experience summary, and confirmation of immediate availability for Pacific Time hours. This plan compiles the tailored application text following the applicant's exact style preferences (American English, conclusion first, zero fluff or AI boilerplate, concise paragraphs).

## Current state

- Handoff doc notes:
  - Role: Full Stack Developer (OnlineJobs.ph #1750756), AI SaaS startup.
  - Required elements: GitHub profile, 2–3 full-stack repos, live demos, AI/LLM summary, PT business hours confirmation, start date (Nov 2, 2026).
  - Background: 4+ years full-stack, strong CI/CD and test automation (Vessel Vanguard: Rsbuild migration, 15 to 67+ E2E tests, custom GitHub Action), payment/auth integrations at Weberlly.
  - Style rules: American English, conclusion first, no em dashes, no preamble or wrap-up, no flattery, short paragraphs.

## Commands you will need

| Purpose           | Command                                    | Expected on success       |
| ----------------- | ------------------------------------------ | ------------------------- |
| Word count & lint | `wc -w docs/job-application-submission.md` | between 250 and 450 words |

## Scope

**In scope**:

- `docs/job-application-submission.md` (the ready-to-submit application text)
- `docs/interview-prep-talking-points.md` (concise technical defense of architecture decisions for the 30-minute screening call)

**Out of scope**:

- Submitting the application automatically via web scraping or automated browser scripts (Joaquin submits manually through OnlineJobs.ph)

## Git workflow

- Branch: `advisor/007-job-application-submission`
- Commit convention: Conventional Commits (e.g. `docs: draft onlinejobs application package and technical talking points`)

## Steps

### Step 1: Draft the OnlineJobs.ph Application Submission

Create `docs/job-application-submission.md` adhering strictly to user preferences:

- **Conclusion first**: Immediate statement of role match, PT availability, and Nov 2 start date.
- **GitHub & Portfolio Repositories**:
  1. `multi-tenant-customer-reply-drafter` (Next.js 16, Supabase Postgres RLS, Anthropic Claude 3.5 streaming, Playwright E2E suite, Docker). Include live demo link and test credentials.
  2. Vessel Vanguard portfolio highlights (Rsbuild migration, E2E test suite from 15 to 67+ tests, custom GitHub Action).
  3. Weberlly integrations (REST APIs, authentication, payments).
- **AI/LLM Experience Summary**:
  - Honest, practical, zero hype.
  - Focuses on production concerns: deterministic context grounding, "not enough information" fallbacks to prevent hallucinations, tenant data isolation via PostgreSQL RLS, and server-side token quota enforcement.
- **Availability Confirmation**:
  - Confirms full-time 40 hours/week during Pacific Time business hours starting November 2, 2026.

**Verify**: Check word count and ensure zero em dashes (`—`) are present in `docs/job-application-submission.md`.

### Step 2: Create Technical Screening Talking Points

Create `docs/interview-prep-talking-points.md`:

- Quick-reference bullet points for the 30-minute screening call:
  1. _Why direct context injection over vector search?_ For customer support policies (<100 documents), direct prompt injection guarantees 100% recall, zero embedding drift, no vector DB hosting bills, and stays well within Claude's context window.
  2. _How is tenant isolation guaranteed?_ PostgreSQL Row Level Security (RLS) bound to `auth.uid()` and `workspace_members`, checked at the database engine level, not in application middleware.
  3. _How are API costs controlled?_ Atomic quota checks at `/api/draft` incrementing a monthly counter in PostgreSQL before tokens stream, returning HTTP 429 when exhausted.
  4. _Testing & Reliability:_ Automated Playwright tests running against mock LLM responses in GitHub Actions CI prior to merge.

**Verify**: File exists and adheres to conclusion-first style.

## Test plan

- Verify text contains zero em dashes (`grep -n "—" docs/job-application-submission.md` returns no matches).
- Check that all four required submission items from the job posting are answered clearly.

## Done criteria

- [ ] `docs/job-application-submission.md` created, formatted, and verified against style preferences
- [ ] `docs/interview-prep-talking-points.md` created with clear technical defenses
- [ ] Zero em dashes in the drafted text
- [ ] `plans/README.md` status row updated

## STOP conditions

- If Joaquin provides updated links for other past client repositories, replace placeholder portfolio URLs.

## Maintenance notes

- Reviewers often ask about test projects during the 30-minute call; review the talking points before the interview.
