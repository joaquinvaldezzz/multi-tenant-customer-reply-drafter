# Live Supabase Local Stack in CI for RLS Verification

We run a real Supabase local container stack (`supabase start`) within the GitHub Actions CI environment to execute Playwright E2E tests, rather than mocking backend responses or auth endpoints. This trades approximately 2 minutes of container initialization time for deterministic verification of actual PostgreSQL Row Level Security (RLS) policies and session management across tenants.
