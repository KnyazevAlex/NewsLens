# NewsLens

**An AI-powered news hub for article analysis, bias estimation, and semantic discovery.**

NewsLens fetches news articles through a scraping pipeline, analyzes them with LLMs, generates summaries and estimated bias ratings, and discovers related articles using vector similarity search with PostgreSQL and pgvector.

It also exposes dedicated REST API endpoints for article scraping and AI-powered analysis.

## Why I Built This

NewsLens is my first project combining a dedicated scraping and analysis API with an automated AI pipeline. It was also an experiment in **AI engineering**: using AI coding agents to build and integrate systems that go beyond what I could comfortably implement independently at the time.

Rather than manually writing every component, I used an `AGENTS.md` file to define project conventions, implementation strategies, architectural constraints, and guidance for coding agents.

My role focused on defining requirements, directing implementation, reviewing generated code, making architectural decisions, and iterating on the system. The project taught me how to approach larger engineering problems while learning unfamiliar technologies along the way.

**AI-assisted development tools used:** Gemini 3.1 Pro, Gemini 3.6 Flash, and GPT-5.6.

## Tech Stack

- **Framework:** Next.js, TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase / PostgreSQL
- **Authentication:** Clerk
- **Scraping:** Oxylabs
- **AI integration:** Vercel AI SDK, Gemini models
- **Semantic search:** pgvector

## Key Features

- Automated article scraping and content extraction
- LLM-powered article summaries and bias analysis
- Structured AI outputs with schema validation
- Related-article discovery using vector embeddings and pgvector
- Dedicated REST API endpoints for scraping and analysis
- Persistent storage for articles, analyses, and pipeline logs

## Cost and Accessibility

The project was developed using free-tier tools and accounts, including the AI models available to me at no cost during development. Actual usage limits and pricing depend on the provider and its current plans.

## A Note on AI Engineering

NewsLens is an AI-co-engineered project, not a claim that every line of code was written independently. Its scope exceeds what I can currently reproduce from scratch at the same speed without AI assistance.

That is part of the point: I wanted to explore how far I could go by combining software fundamentals, architectural thinking, and AI coding agents—and use the process to identify what I still need to learn.