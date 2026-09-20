# ChildBloom AI Rewriter — Design Spec

## Date: 2026-09-19
## Status: Approved

---

## 1. Overview

A pure client-side web application deployed on Vercel that rewrites articles for childbloom.site
using any OpenAI-compatible API. Users bring their own API key and model name — everything runs
in the browser, no backend server required.

## 2. Architecture

**Pure client-side → Vercel static hosting → OpenAI-compatible API (browser-to-API)**

- No server-side API keys
- No database, no user accounts
- All state in localStorage
- Streaming directly from API to browser (no intermediary)
- Vercel auto-deploy on git push

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Icons | lucide-react |
| Markdown | react-markdown + remark-gfm |
| File Parsing | mammoth (.docx), pdfjs-dist (.pdf) |
| API | OpenAI JS SDK (browser-compatible) |
| Deployment | Vercel |

## 4. Page Structure

Single-page app with tab navigation + settings tab:

### Upload Tab
- Drag-and-drop file upload (.txt, .md, .docx, .pdf, .html)
- Writing mode selector: ContentForge SEO / Claude SEO (toggle buttons)
- Output format: Chirpy Jekyll / CMS-Ready HTML / Clean Markdown
- Rewrite button with loading state
- Streaming markdown output with progress indicator
- Action buttons: Copy, Download .md, Download HTML, Re-generate

### History Tab
- Search bar
- List of past articles (name, date, word count, mode used)
- Per-article: View, Copy, Download, Delete
- Clear All button

### Settings Tab
- API Key (password input, localStorage)
- Base URL (text input)
- Model name (text input with suggestions)
- Temperature (slider 0-2)
- Max Tokens (slider 4000-90000)
- Connection test button

## 5. Prompt Architecture (Three-Layer System)

All three prompt layers merge into a single system prompt sent to the API:

### Layer 1: Persona — ChildBloom
- Pediatric health, baby-care, parenting authority
- E-E-A-T compliant (Experience, Expertise, Authoritativeness, Trustworthiness)
- Physician-authored tone

### Layer 2: ContentForge + Claude SEO (combo mode)
- ContentForge: aggressive SEO structure, 4000+ words, 15+ headings, FAQs, meta tags
- Claude SEO: analytical, research-backed, deep expertise, analogies, metaphors

### Layer 3: Format Rules
- Chirpy Jekyll frontmatter OR CMS-ready HTML output
- No promotional content removal rule
- Auto-continue for long articles

## 6. Data Flow

```
File Upload → Parse to text
      ↓
Validate (size < 10MB, supported type)
      ↓
Build system prompt (Persona + Mode + Format)
      ↓
OpenAI-compatible streaming client
      ↓
Render streaming markdown live
      ↓
Save to localStorage
      ↓
User copies/downloads
```

## 7. Error Handling

| Error | User-facing behavior |
|-------|---------------------|
| 401 Unauthorized | "Invalid API key. Check Settings." |
| 429 Rate limited | Auto-retry 3x with exponential backoff |
| 404 Model not found | "Model not found. Try gpt-4.1." |
| Token limit hit | Auto-continue with previous context |
| Network timeout (60s) | "Connection timed out. Retry?" |
| File too large | "File > 10MB limit." |
| CORS blocked | "API blocks browser. Try different provider." |
| Empty output | "Article empty. Try again." |

## 8. Auto-Continue Logic

When a response ends before reaching FAQs section:
1. Detect incomplete output (no conclusion/FAQs markers)
2. Send continuation request with full previous context
3. Merge seamlessly — user never sees the break

## 9. Output Formats

| Format | Description |
|--------|-------------|
| Chirpy Jekyll | Markdown with YAML frontmatter (title, desc, author, date, categories, tags, image) |
| CMS-Ready HTML | Full HTML with `<article>` tag, semantic markup, meta tags |
| Clean Markdown | Markdown without frontmatter |

## 10. Project Structure

```
childbloom-rewriter/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── upload-tab.tsx
│   ├── history-tab.tsx
│   ├── settings-tab.tsx
│   ├── streaming-output.tsx
│   ├── mode-selector.tsx
│   └── ui/ (shadcn: button, card, tabs, slider, dialog, toast)
├── lib/
│   ├── prompts.ts
│   ├── openai-client.ts
│   ├── file-parser.ts
│   └── history.ts
├── prompts/
│   ├── childbloom.md
│   ├── contentforge.md
│   ├── claude-seo.md
│   └── formats.md
├── public/
│   └── favicon.ico
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```
