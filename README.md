# ChildBloom Rewriter

AI-powered article rewriter for [childbloom.site](https://childbloom.site). Transforms raw articles into SEO-optimized, E-E-A-T compliant pediatric content using any OpenAI-compatible API.

## Features

- **Three-layer prompt system:** ChildBloom persona + ContentForge SEO / Claude SEO + output format rules
- **Streaming output:** Watch the article being written in real-time
- **Multiple file formats:** Upload .txt, .md, .docx, .pdf, .html
- **Three output formats:** CMS-Ready HTML, Chirpy Jekyll Markdown, Clean Markdown
- **Article history:** Previous rewrites saved to localStorage
- **Client-side only:** API key stays in your browser — nothing sent to any server

## Quick Start

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build
```

Then open http://localhost:3000.

## Deployment

Deploy to Vercel with one click:

1. Push to GitHub
2. Import on https://vercel.com
3. No environment variables needed — all config is client-side

## Configuration

On first use, go to the **Settings** tab and enter:

| Field | Description |
|-------|-------------|
| API Key | Your OpenAI-compatible API key |
| Base URL | API endpoint (e.g., `https://models.github.ai/inference`) |
| Model Name | Model to use (e.g., `gpt-4.1`, `claude-sonnet-4-20250514`) |
| Temperature | 0–2 (controls randomness) |
| Max Tokens | Token limit for response |

## Compatible APIs

- OpenAI API
- GitHub Inference
- Anthropic (via OpenAI-compatible endpoints)
- OpenRouter
- Any OpenAI-compatible endpoint

## Tech Stack

Next.js 14 • TypeScript • Tailwind CSS • shadcn/ui • OpenAI JS SDK

## License

MIT
