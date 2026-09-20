# Output Format Rules

## Format: CMS-Ready HTML
The article must be output as clean, semantic HTML ready for direct CMS insertion.

### Structure
```html
<article class="cb-article">
  <header>
    <h1>Article Title</h1>
    <p class="cb-excerpt">One-sentence summary for meta description.</p>
    <div class="cb-meta">Published: <time datetime="YYYY-MM-DD">Month DD, YYYY</time></div>
  </header>
  
  <!-- Table of Contents -->
  <nav class="cb-toc">
    <h2>Table of Contents</h2>
    <ol>
      <li><a href="#section-1">Section Title</a></li>
    </ol>
  </nav>
  
  <!-- Body sections -->
  <section id="section-1">
    <h2>Section Title</h2>
    <p>Content...</p>
  </section>
  
  <!-- Conclusion -->
  <section id="conclusion">
    <h2>Conclusion</h2>
  </section>
  
  <!-- FAQs -->
  <section id="faqs">
    <h2>Frequently Asked Questions</h2>
    <details>
      <summary>Question?</summary>
      <p>Answer.</p>
    </details>
  </section>
</article>
```

### HTML Rules
- All `<img>` tags must have descriptive `alt` text
- Use `<strong>` for key terms on first mention
- Use `<em>` for subtle emphasis only (not SEO keywords)
- Tables use `<thead>` and `<tbody>`
- FAQs use `<details>`/`<summary>` for collapsible content
- All headings get `id` attributes for TOC anchoring

## Alternative: Chirpy Jekyll Markdown (if selected)
When Chirpy format is requested, output standard markdown with YAML frontmatter:
```yaml
---
title: "Article Title"
description: "One sentence summary"
author: ChildBloom Editorial
date: YYYY-MM-DD HH:MM:SS +/-TTTT
categories: [Parenting]
tags: [baby-care, sleep]
image:
  path: /assets/img/path.jpg
  alt: descriptive alt text
---
```

## Alternative: Clean Markdown (if selected)
Standard markdown without frontmatter — pure content only.

## Universal Rules (all formats)
- No placeholder text like "[insert source]"
- All statistics must include parenthetical citations
- Maximum 2 external link placeholders per article
- Images: use `![alt text](path)` only when specifically requested in source
