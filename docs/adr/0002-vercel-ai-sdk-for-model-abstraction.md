# Vercel AI SDK for LLM Provider Abstraction

We use the Vercel AI SDK (`ai` with `@ai-sdk/anthropic`) instead of direct raw SDK calls for LLM streaming and prompt grounding. This standardizes streaming primitives in Next.js App Router, provides unified hooks for client workbench components, and allows switching or expanding from Claude 3.5 Sonnet to OpenAI models without rewriting streaming endpoints.
