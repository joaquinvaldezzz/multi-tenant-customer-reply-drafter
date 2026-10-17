# Customer Reply Drafter

Multi-tenant customer reply generation grounded in small business knowledge base entries.

## Language

**Workspace**:
A tenant boundary that owns knowledge base entries, usage quotas, and member access.
_Avoid_: Organization, Team, Account, Tenant

**Member**:
A user associated with a workspace under a specific role (`owner` or `member`).
_Avoid_: Collaborator, Teammate, User (when referring to tenant membership)

**Knowledge Base Entry**:
A discrete FAQ or policy statement owned by a workspace that provides authoritative grounding for drafts.
_Avoid_: Document, Article, Note, Context item

**Draft**:
An AI-generated customer response grounded strictly in the workspace's knowledge base entries.
_Avoid_: Completion, Generation, Response, Message

**Draft Quota**:
The monthly allotment of generated drafts permitted per workspace before requests are rejected with status 429.
_Avoid_: Rate limit, Token cap, Usage allowance

**Fallback Sentinel**:
A standardized token (`[INSUFFICIENT_KNOWLEDGE]`) prepended by the LLM when existing Knowledge Base Entries lack facts to answer a customer inquiry.
_Avoid_: Error code, Refusal string, Missing data marker
