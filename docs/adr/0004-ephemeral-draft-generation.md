# Ephemeral Draft Generation Without Persistence

We stream generated drafts directly to the client workbench with a one-click copy action, persisting only the atomic quota counter increment in `workspace_usage` rather than saving customer inquiries and draft text in Postgres. This eliminates customer PII retention liability, avoids database storage bloat, simplifies RLS policies, and prevents scope creep within the 7-day delivery timeline.
