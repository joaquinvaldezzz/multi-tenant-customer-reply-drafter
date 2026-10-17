# Handoff: Full Stack Developer (OnlineJobs.ph #1750756) application

## Goal

Joaquin (full-stack dev, Bulacan, PH) is deciding how to apply for a full-time Full Stack Developer role at an AI business-automation startup. Next session should focus on building the portfolio repo and drafting the application.

## Source material

- Job post: /mnt/user-data/uploads/Full_Stack_Developer_1750756.md (https://www.onlinejobs.ph/jobseekers/job/full-stack-developer-1750756)
- CV: /mnt/user-data/uploads/John_Joaquin_A__Valdez_CV.pdf
- Memory file /areas/job-applications.md already logs this posting as under consideration.

## Role summary

Full-time, remote, Pacific Time business hours, start Nov 2, 2026. Builds MVPs of AI SaaS tools: React/Next.js/TypeScript, Node/Express, Postgres/MongoDB, LLM APIs (OpenAI, Claude), multi-tenant APIs. Process: GitHub review, 30 min call, paid test project, panel interview.

Application must include: GitHub link (no link means no review), 2-3 best full-stack repos, live demos (preferred), short AI/LLM experience summary, confirmation of immediate start and PST hours.

## Fit assessment (conclusion given)

Moderately strong on paper, exposed on the first screen.

Strengths: stack match, 4+ years, CI/CD and test automation (Vessel Vanguard: Rsbuild migration, E2E 15 to 67+ tests, custom GitHub Action), integrations (payments, auth, REST at Weberlly), async work with US/AU teams.

Gaps: no LLM/AI experience on CV, MySQL/DynamoDB instead of Postgres/MongoDB, no evidence of multi-tenant or subscription billing work, titles read front-end-heavy, no Docker/Terraform/FastAPI. GitHub quality unseen and is the main gatekeeper.

Recommended framing: full-stack developer who owns build, test, and release; lead with Vessel Vanguard and REST/auth/payments work. Write the AI summary honestly and point to the new repo.

## Agreed plan: portfolio repo

Multi-tenant customer reply drafter for small businesses.

- Stack: Next.js + TypeScript, Tailwind, Supabase (Postgres, auth, RLS), Vercel AI SDK (`ai` + `@ai-sdk/anthropic` with Claude 3.5 Sonnet), deploy on Netlify or Vercel.
- Features: multi-workspace switching per user via HTTP-only cookie, memberships with RLS (owner/member roles), knowledge base entries CRUD (capped at 50 entries, 1,000 characters each), streamed draft endpoint grounded strictly in prompt context with a "not enough info" fallback, atomic monthly quota enforcement (50 drafts/month per workspace via Postgres RPC).
- Differentiators: Playwright suite for signup-to-draft flow, GitHub Actions CI, Dockerfile, README with architecture section, screenshots, demo login.
- Deliberate trade-offs: no embeddings or vector DB (direct prompt context injection, documented in ADR 0001); atomic usage counters via RPC (ADR 0003); Vercel AI SDK provider abstraction (ADR 0002).
- Stretch: Stripe test mode, tone presets, saved-replies history.
- Timeline: about 7 days (schema/auth/RLS, then CRUD/draft/usage, then tests/CI/Docker, then deploy/README).
- Hygiene: API key server-side only, small meaningful commits.

## Open items

- User confirmed portfolio-first path on 2026-10-17: complete Plans 001-006 before submitting application (Plan 007).
- Unknown: contents of his GitHub profile, any existing LLM work, whether he can commit to PT hours (assumed yes).
- Application text (AI summary, repo list, start/hours confirmation) not yet drafted.

## Suggested skills for next agent

- `freelance-application-assistant` or `direct-client-job-applications`: tailor the application message to the posting.
- `antislop-copywriting`: keep the application and README prose free of generic AI phrasing.
- `frontend-design`: if building the UI for the demo app.
- `docs`/`docx` only if he asks for a document deliverable.

## User style preferences

American English, PHP, metric. No preamble or wrap-up, no flattery, no em dashes, short paragraphs, conclusion first, push back on weak logic.
