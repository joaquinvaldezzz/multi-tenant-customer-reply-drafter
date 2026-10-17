# In-Prompt Knowledge Base Context Without Vector Database

We inject all active Knowledge Base Entries for a Workspace directly into the LLM system prompt on every generation request, capping each Workspace at 50 entries of at most 1,000 characters each. We chose full prompt injection over vector embeddings (`pgvector`) because target SMB policy bases are small (<50 items, ~15k tokens), eliminating embedding sync latency, indexing bugs, and partial-recall failures while fitting comfortably within modern LLM context windows.
