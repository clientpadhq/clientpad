# AEO Infrastructure — ClientPad

ClientPad uses Dualmark for Answer Engine Optimization (AEO), making public marketing and documentation pages easier for AI crawlers and answer engines (ChatGPT, Claude, Perplexity, Google AI, etc.) to understand.

## Architecture

```
AI Crawler (GPTBot, ClaudeBot, etc.)
        │
        ▼
  Content Negotiation Server
  (packages/marketing/src/server.ts)
        │
        ├── Accept: text/markdown  → serves .md twin (noindex)
        ├── AI Bot User-Agent      → serves .md twin (noindex)
        └── Normal browser         → serves .html (Link: rel=alternate → .md)
```

## How it works

1. **Content negotiation** — The server checks the `Accept` header and `User-Agent` to decide whether to serve HTML or Markdown.
2. **AI bot detection** — Known AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) are automatically served clean Markdown.
3. **Link rel=alternate** — Normal HTML pages include `<link rel="alternate" type="text/markdown">` so AI crawlers can discover the Markdown twin.
4. **noindex on Markdown** — Markdown responses carry `X-Robots-Tag: noindex` to prevent duplicate content indexing.
5. **llms.txt** — Auto-generated at `/llms.txt` with a structured site map following the llms.txt convention.
6. **llms-full.txt** — Full content at `/llms-full.txt` with all markdown pages concatenated for AI context windows.

## Pages covered

| Route | HTML | Markdown Twin | Description |
|-------|------|---------------|-------------|
| `/` | `public/index.html` | `public/index.md` | Landing page |
| `/docs/whatsapp-magic` | `public/docs/whatsapp-magic.html` | `public/docs/whatsapp-magic.md` | WhatsApp integration |
| `/docs/public-api` | `public/docs/public-api.html` | `public/docs/public-api.md` | REST API docs |
| `/docs/open-source` | `public/docs/open-source.html` | `public/docs/open-source.md` | Architecture |
| `/docs/clientpad-cloud` | `public/docs/clientpad-cloud.html` | `public/docs/clientpad-cloud.md` | Cloud offering |

## AI bot detection

The server detects these AI crawlers by User-Agent:

- GPTBot / ChatGPT-User / OAI-SearchBot (OpenAI)
- ClaudeBot / Claude-Web / anthropic-ai (Anthropic)
- PerplexityBot (Perplexity)
- Googlebot / GoogleOther (Google)
- Bingbot (Microsoft)
- Applebot (Apple)
- DuckDuckBot (DuckDuckGo)
- CohereBot (Cohere)
- MetaBot (Meta)
- Amazonbot (Amazon)
- Bytespider (ByteDance)
- YouBot (You.com)

## Adding a new page

1. Create the HTML file in `packages/marketing/public/`:
   ```html
   <!-- Include <link rel="alternate" type="text/markdown" href="/your-page.md"> in <head> -->
   ```

2. Create the Markdown twin (same path, `.md` extension):
   ```markdown
   # Your Page Title
   Content in clean Markdown for AI crawlers.
   ```

3. Register the page in `packages/marketing/src/server.ts`:
   ```ts
   const PAGES: Record<string, PageEntry> = {
     // ... existing pages ...
     "/your-page": {
       htmlPath: join(PUBLIC_DIR, "your-page.html"),
       mdPath: join(PUBLIC_DIR, "your-page.md"),
       contentType: "text/html; charset=utf-8",
     },
   };
   ```

4. Add the page to `/llms-full.txt` in `buildLlmsFullTxt()`.

## Running locally

```bash
# Install dependencies
pnpm install

# Start marketing server
pnpm --filter @clientpad/marketing dev

# Open in browser
open http://localhost:3099

# Test markdown output (simulates AI bot)
curl -H "Accept: text/markdown" http://localhost:3099/

# Test AI bot detection
curl -H "User-Agent: GPTBot/1.0" http://localhost:3099/

# View llms.txt
curl http://localhost:3099/llms.txt
```

## Verification with Dualmark CLI

```bash
# Start the server first, then verify
pnpm dualmark verify http://localhost:3099

# Or verify a deployed URL
pnpm dualmark verify https://clientpad.com
```

## Design decisions

- **No framework dependency** — Uses Node.js built-in `http` module, not Express. This keeps the package dependency-light, consistent with the ClientPad philosophy.
- **Bot detection built-in** — `@dualmark/core` provides `detectAIBot()` but the server includes its own bot detection for simplicity and to avoid depending on Dualmark's bot list updates.
- **Static content** — All content is static files. No database, no SSR, no API calls — pure content negotiation over static assets.
- **Separate deployment** — The marketing server is independent from the dashboard and API server. It can be deployed on its own port or behind a reverse proxy.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3099` | Server port |
| `MARKETING_BASE_URL` | `https://clientpad.com` | Base URL used in llms.txt generation |
