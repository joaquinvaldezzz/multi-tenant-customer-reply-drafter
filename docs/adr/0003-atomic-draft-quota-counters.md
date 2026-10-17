# Atomic Monthly Quota Enforcement via Postgres RPC

We track workspace monthly draft generation limits using an atomic counter row in `workspace_usage` incremented via a PostgreSQL stored procedure (`increment_workspace_draft_usage`), rather than executing `COUNT(*)` over draft records. This guarantees zero race conditions during concurrent generation requests, avoids costly sequential table scans, and provides deterministic 429 quota exhaustion enforcement.
