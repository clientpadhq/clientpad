import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAcceptHeader, mediaTypeMatches } from "@dualmark/core";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

interface PageEntry {
  htmlPath: string;
  mdPath: string;
  contentType: string;
}

const PAGES: Record<string, PageEntry> = {
  "/": {
    htmlPath: join(PUBLIC_DIR, "index.html"),
    mdPath: join(PUBLIC_DIR, "index.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/docs/whatsapp-magic": {
    htmlPath: join(PUBLIC_DIR, "docs", "whatsapp-magic.html"),
    mdPath: join(PUBLIC_DIR, "docs", "whatsapp-magic.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/docs/public-api": {
    htmlPath: join(PUBLIC_DIR, "docs", "public-api.html"),
    mdPath: join(PUBLIC_DIR, "docs", "public-api.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/docs/open-source": {
    htmlPath: join(PUBLIC_DIR, "docs", "open-source.html"),
    mdPath: join(PUBLIC_DIR, "docs", "open-source.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/docs/clientpad-cloud": {
    htmlPath: join(PUBLIC_DIR, "docs", "clientpad-cloud.html"),
    mdPath: join(PUBLIC_DIR, "docs", "clientpad-cloud.md"),
    contentType: "text/html; charset=utf-8",
  },
};

const AI_BOT_PATTERNS: { pattern: RegExp; name: string; vendor: string }[] = [
  { pattern: /GPTBot/i, name: "GPTBot", vendor: "OpenAI" },
  { pattern: /ChatGPT-User/i, name: "ChatGPT-User", vendor: "OpenAI" },
  { pattern: /Claude-Web|ClaudeBot|anthropic-ai/i, name: "ClaudeBot", vendor: "Anthropic" },
  { pattern: /PerplexityBot/i, name: "PerplexityBot", vendor: "Perplexity" },
  { pattern: /Googlebot|GoogleOther/i, name: "GoogleBot", vendor: "Google" },
  { pattern: /Bingbot/i, name: "Bingbot", vendor: "Microsoft" },
  { pattern: /Applebot/i, name: "Applebot", vendor: "Apple" },
  { pattern: /DuckDuckBot/i, name: "DuckDuckBot", vendor: "DuckDuckGo" },
  { pattern: /cohere|cohere-ai/i, name: "CohereBot", vendor: "Cohere" },
  { pattern: /meta-externalagent|meta-externalfetcher/i, name: "MetaBot", vendor: "Meta" },
  { pattern: /Amazonbot/i, name: "Amazonbot", vendor: "Amazon" },
  { pattern: /OAI-SearchBot/i, name: "OAISearchBot", vendor: "OpenAI" },
  { pattern: /Bytespider/i, name: "Bytespider", vendor: "ByteDance" },
  { pattern: /YouBot/i, name: "YouBot", vendor: "You.com" },
];

let llmsTxtCache: string | null = null;
let llmsFullTxtCache: string | null = null;

function detectAIBot(userAgent: string): { isBot: boolean; name: string | null; vendor: string | null } {
  if (!userAgent) return { isBot: false, name: null, vendor: null };
  for (const bot of AI_BOT_PATTERNS) {
    if (bot.pattern.test(userAgent)) {
      return { isBot: true, name: bot.name, vendor: bot.vendor };
    }
  }
  return { isBot: false, name: null, vendor: null };
}

function acceptsMarkdown(acceptHeader: string): boolean {
  if (!acceptHeader) return false;
  const types = acceptHeader.split(",").map((t) => t.trim().split(";")[0]!);
  return types.includes("text/markdown") || types.includes("text/*");
}

function normalizePathKeepExt(url: string): { path: string; ext: string | null } {
  const raw = url.split("?")[0]!.split("#")[0]!;
  let path = raw.replace(/\/+$/, "") || "/";
  if (path.endsWith(".md")) return { path: path.slice(0, -3) || "/", ext: ".md" };
  if (path.endsWith(".html")) return { path: path.slice(0, -5) || "/", ext: ".html" };
  return { path: path || "/", ext: null };
}

function toMarkdownPath(path: string): string {
  if (path === "/") return "/index.md";
  if (path.endsWith(".md")) return path;
  return `${path}.md`;
}

async function tryReadFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

function estimateTokens(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words * 1.3));
}

function buildLlmsTxt(): string {
  const baseUrl = process.env.MARKETING_BASE_URL || "https://clientpad.com";
  const mdBase = `${baseUrl}`;

  const sections = [
    {
      title: "ClientPad",
      description: "ClientPad is open-source WhatsApp-first CRM infrastructure for service businesses and developers building client workflows. Turns WhatsApp conversations into leads, bookings, payments, follow-ups, reviews, and client pipelines.",
      links: [
        { title: "ClientPad Home", href: `${mdBase}/index.md`, description: "Landing page with product overview and capabilities" },
      ],
    },
    {
      title: "Documentation",
      links: [
        { title: "WhatsApp Magic", href: `${mdBase}/docs/whatsapp-magic.md`, description: "WhatsApp automation for service businesses: lead capture, bookings, payments" },
        { title: "Public API", href: `${mdBase}/docs/public-api.md`, description: "REST API reference and TypeScript SDK guide" },
        { title: "Open-Source Architecture", href: `${mdBase}/docs/open-source.md`, description: "Package structure, database design, and auth architecture" },
        { title: "ClientPad Cloud", href: `${mdBase}/docs/clientpad-cloud.md`, description: "Managed hosting, plans, and billing" },
      ],
    },
    {
      title: "Developers",
      links: [
        { title: "GitHub Repository", href: "https://github.com/clientpadhq/clientpad", description: "Full source code, issues, and contributions" },
        { title: "npm Packages", href: "https://www.npmjs.com/search?q=%40clientpad", description: "@clientpad scoped packages on npm" },
      ],
    },
  ];

  let output = `# ClientPad\n\n`;
  output += `> ${sections[0]!.description}\n\n`;

  for (const section of sections) {
    output += `## ${section.title}\n\n`;
    if (section.description) {
      output += `${section.description}\n\n`;
    }
    for (const link of section.links) {
      output += `- [${link.title}](${link.href})`;
      if (link.description) output += `: ${link.description}`;
      output += `\n`;
    }
    output += `\n`;
  }

  return output;
}

async function buildLlmsFullTxt(): Promise<string> {
  const pages: { path: string; title: string }[] = [
    { path: "/index.md", title: "ClientPad" },
    { path: "/docs/whatsapp-magic.md", title: "WhatsApp Magic" },
    { path: "/docs/public-api.md", title: "Public API" },
    { path: "/docs/open-source.md", title: "Open-Source Architecture" },
    { path: "/docs/clientpad-cloud.md", title: "ClientPad Cloud" },
  ];

  let output = "";
  for (const page of pages) {
    const content = await tryReadFile(join(PUBLIC_DIR, page.path));
    if (content) {
      output += `# ${page.title}\n\n${content}\n\n---\n\n`;
    }
  }
  return output;
}

function serveError(res: ServerResponse, status: number, message: string) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(message);
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = req.url || "/";
  const userAgent = req.headers["user-agent"] || "";
  const accept = req.headers["accept"] || "";

  // Handle llms.txt
  if (url === "/llms.txt" || url === "/llms.txt?") {
    if (!llmsTxtCache) llmsTxtCache = buildLlmsTxt();
    res.writeHead(200, {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-robots-tag": "noindex",
    });
    res.end(llmsTxtCache);
    return;
  }

  // Handle llms-full.txt
  if (url === "/llms-full.txt" || url === "/llms-full.txt?") {
    if (!llmsFullTxtCache) llmsFullTxtCache = await buildLlmsFullTxt();
    res.writeHead(200, {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-robots-tag": "noindex",
    });
    res.end(llmsFullTxtCache);
    return;
  }

  const { path: rawPath, ext } = normalizePathKeepExt(url);
  const path = rawPath === "/index" ? "/" : rawPath;
  const isDirectMdRequest = ext === ".md";

  // 406 Not Acceptable: reject if Accept explicitly excludes both html and markdown
  if (accept && !isDirectMdRequest) {
    const parsed = parseAcceptHeader(accept);
    const acceptsHtml = parsed.some((m) => mediaTypeMatches(m, "text", "html"));
    const acceptsMd = parsed.some((m) => mediaTypeMatches(m, "text", "markdown"));
    const acceptsWildcard = parsed.some((m) => m.type === "*");
    if (!acceptsHtml && !acceptsMd && !acceptsWildcard && parsed.length > 0) {
      serveError(res, 406, "Not Acceptable");
      return;
    }
  }

  // Content negotiation: check if AI bot or explicitly requests markdown
  const bot = detectAIBot(userAgent);
  const wantsMarkdown = isDirectMdRequest || acceptsMarkdown(accept) || bot.isBot;

  const page = PAGES[path];
  if (page) {
    if (wantsMarkdown) {
      const mdContent = await tryReadFile(page.mdPath);
      if (mdContent) {
        const proto = (req.headers["x-forwarded-proto"] as string) || "http";
        const host = req.headers.host || "localhost";
        const htmlUrl = `${proto}://${host}${path}`;
        const tokens = estimateTokens(mdContent);

        res.writeHead(200, {
          "content-type": "text/markdown; charset=utf-8",
          "x-robots-tag": "noindex",
          "x-markdown-tokens": String(tokens),
          "x-aeo-version": "1.0",
          "x-content-type-options": "nosniff",
          "vary": "Accept",
          "link": `<${htmlUrl}>; rel="canonical"`,
          "cache-control": "public, max-age=3600",
        });
        res.end(mdContent);
        return;
      }
    }

    // Default: serve HTML
    const htmlContent = await tryReadFile(page.htmlPath);
    if (htmlContent) {
      const proto = (req.headers["x-forwarded-proto"] as string) || "http";
      const host = req.headers.host || "localhost";
      const mdUrl = `${proto}://${host}${toMarkdownPath(path)}`;
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "vary": "Accept",
        "link": `<${mdUrl}>; rel="alternate"; type="text/markdown"`,
        "cache-control": "public, max-age=3600",
      });
      res.end(htmlContent);
      return;
    }
  }

  serveError(res, 404, "Not found");
});

const PORT = parseInt(process.env.PORT || "3099", 10);

server.listen(PORT, () => {
  console.log(`ClientPad marketing server running on http://localhost:${PORT}`);
  console.log(`llms.txt: http://localhost:${PORT}/llms.txt`);
  console.log(`Pages: ${Object.keys(PAGES).map((p) => `http://localhost:${PORT}${p}`).join(", ")}`);
});
