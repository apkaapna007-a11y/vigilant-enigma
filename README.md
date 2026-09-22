# ChildBloom Rewriter

AI-powered article rewriter for [childbloom.site](https://childbloom.site). Transforms raw articles into SEO-optimized, E-E-A-T compliant pediatric content using any OpenAI-compatible API.

## Features

- **Strict prompt hierarchy:** Medical safety → Topic/facts preservation → No hallucinations → Mode rules → Output format
- **Three-layer prompt system:** ChildBloom persona (soul.md) + ContentForge SEO / Claude SEO + output format rules
- **Strong post-generation validation:** Strips code fences, meta-commentary, AI artifacts; soft topic-drift checks
- **Streaming output** with live word count, progress, Preview / Raw toggle (HTML or Markdown)
- **File upload:** .txt, .md, .docx, .pdf, .html with drag-and-drop
- **Three output formats:** CMS-Ready HTML (WordPress-compatible), Chirpy Jekyll Markdown, Clean Markdown
- **Article history:** LocalStorage, searchable, HTML preview for CMS format
- **Client-side only:** API key stays in your browser — never logged or sent to any server

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deployment

Deploy to Vercel:

1. Push to GitHub
2. Import on https://vercel.com
3. No environment variables needed — all config is client-side

## Configuration

On first use, open **Settings** and enter:

| Field | Description |
|-------|-------------|
| API Key | Your OpenAI-compatible API key |
| Base URL | API endpoint (e.g. `https://openrouter.ai/api/v1`) |
| Model Name | Model to use |
| Temperature | 0–2 |
| Max Tokens | Token limit |

## Compatible APIs

- OpenRouter (recommended for browser CORS)
- OpenAI
- Together AI
- Any OpenAI-compatible endpoint (proxy available in Settings)

## Tech Stack

Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui · OpenAI JS SDK · mammoth · pdfjs-dist

## License

MIT
