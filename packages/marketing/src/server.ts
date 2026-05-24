import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

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
  "/about": {
    htmlPath: join(PUBLIC_DIR, "about.html"),
    mdPath: join(PUBLIC_DIR, "about.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/cloud": {
    htmlPath: join(PUBLIC_DIR, "cloud.html"),
    mdPath: join(PUBLIC_DIR, "cloud.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/pricing": {
    htmlPath: join(PUBLIC_DIR, "pricing.html"),
    mdPath: join(PUBLIC_DIR, "pricing.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/developers": {
    htmlPath: join(PUBLIC_DIR, "developers.html"),
    mdPath: join(PUBLIC_DIR, "developers.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/whatsapp": {
    htmlPath: join(PUBLIC_DIR, "whatsapp.html"),
    mdPath: join(PUBLIC_DIR, "whatsapp.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/open-source": {
    htmlPath: join(PUBLIC_DIR, "open-source.html"),
    mdPath: join(PUBLIC_DIR, "open-source.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/security": {
    htmlPath: join(PUBLIC_DIR, "security.html"),
    mdPath: join(PUBLIC_DIR, "security.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/contact": {
    htmlPath: join(PUBLIC_DIR, "contact.html"),
    mdPath: join(PUBLIC_DIR, "contact.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/privacy": {
    htmlPath: join(PUBLIC_DIR, "privacy.html"),
    mdPath: join(PUBLIC_DIR, "privacy.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/terms": {
    htmlPath: join(PUBLIC_DIR, "terms.html"),
    mdPath: join(PUBLIC_DIR, "terms.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/docs": {
    htmlPath: join(PUBLIC_DIR, "docs", "index.html"),
    mdPath: join(PUBLIC_DIR, "docs", "index.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/docs/quickstart": {
    htmlPath: join(PUBLIC_DIR, "docs", "quickstart.html"),
    mdPath: join(PUBLIC_DIR, "docs", "quickstart.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/docs/sdk": {
    htmlPath: join(PUBLIC_DIR, "docs", "sdk.html"),
    mdPath: join(PUBLIC_DIR, "docs", "sdk.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/docs/self-hosting": {
    htmlPath: join(PUBLIC_DIR, "docs", "self-hosting.html"),
    mdPath: join(PUBLIC_DIR, "docs", "self-hosting.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/docs/environment": {
    htmlPath: join(PUBLIC_DIR, "docs", "environment.html"),
    mdPath: join(PUBLIC_DIR, "docs", "environment.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/docs/deployment": {
    htmlPath: join(PUBLIC_DIR, "docs", "deployment.html"),
    mdPath: join(PUBLIC_DIR, "docs", "deployment.md"),
    contentType: "text/html; charset=utf-8",
  },
  "/docs/troubleshooting": {
    htmlPath: join(PUBLIC_DIR, "docs", "troubleshooting.html"),
    mdPath: join(PUBLIC_DIR, "docs", "troubleshooting.md"),
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

async function tryReadAsset(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

function getStaticContentType(pathname: string): string | null {
  if (pathname === "/_headers" || pathname === "/_redirects") {
    return "text/plain; charset=utf-8";
  }
  const ext = extname(pathname).toLowerCase();
  const mime: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".map": "application/json; charset=utf-8",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
  };
  return mime[ext] || null;
}

function resolvePublicFile(pathname: string): string | null {
  if (!pathname.startsWith("/")) return null;
  const decoded = decodeURIComponent(pathname);
  if (decoded.includes("\0")) return null;
  const relativePath = decoded.replace(/^\/+/, "");
  const publicRoot = resolve(PUBLIC_DIR);
  const absolutePath = resolve(publicRoot, relativePath);
  if (absolutePath !== publicRoot && !absolutePath.startsWith(publicRoot + sep)) return null;
  return absolutePath;
}

function estimateTokens(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words * 1.3));
}

function parseAcceptHeader(value: string): { type: string; subtype: string }[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [typePart = "*/*"] = part.split(";", 1);
      const [type = "*", subtype = "*"] = typePart.trim().split("/");
      return { type: type || "*", subtype: subtype || "*" };
    });
}

function mediaTypeMatches(mediaType: { type: string; subtype: string }, type: string, subtype: string) {
  return (mediaType.type === "*" || mediaType.type === type) && (mediaType.subtype === "*" || mediaType.subtype === subtype);
}

function buildLlmsTxt(): string {
  const baseUrl = process.env.MARKETING_BASE_URL || "https://clientpad.xyz";
  const mdBase = `${baseUrl}`;

  const sections = [
    {
      title: "ClientPad",
      description: "ClientPad is open-source infrastructure for WhatsApp-first leads, client workflows, API keys, usage tracking, and operator dashboards.",
      links: [
        { title: "ClientPad Home", href: `${mdBase}/index.md`, description: "Landing page with product overview and capabilities" },
        { title: "About ClientPad", href: `${mdBase}/about.md`, description: "Mission, positioning, and why ClientPad exists" },
        { title: "Pricing", href: `${mdBase}/pricing.md`, description: "Open-source and hosted Cloud pricing model" },
      ],
    },
    {
      title: "Documentation",
      links: [
        { title: "Docs Home", href: `${mdBase}/docs/index.md`, description: "Documentation entry point for developers and operators" },
        { title: "Quickstart", href: `${mdBase}/docs/quickstart.md`, description: "Install and create the first lead" },
        { title: "SDK", href: `${mdBase}/docs/sdk.md`, description: "TypeScript SDK usage" },
        { title: "WhatsApp Magic", href: `${mdBase}/docs/whatsapp-magic.md`, description: "WhatsApp automation for service businesses: lead capture, bookings, payments" },
        { title: "Public API", href: `${mdBase}/docs/public-api.md`, description: "REST API reference and TypeScript SDK guide" },
        { title: "Self-hosting", href: `${mdBase}/docs/self-hosting.md`, description: "Run ClientPad with your own PostgreSQL and deployment" },
        { title: "Open-Source Architecture", href: `${mdBase}/docs/open-source.md`, description: "Package structure, database design, and auth architecture" },
        { title: "ClientPad Cloud", href: `${mdBase}/docs/clientpad-cloud.md`, description: "Hosted gateway, operator dashboard, usage tracking, and Lemon Squeezy checkout" },
        { title: "Environment Variables", href: `${mdBase}/docs/environment.md`, description: "Configuration reference" },
        { title: "Deployment", href: `${mdBase}/docs/deployment.md`, description: "Domain and Netlify deployment guide" },
        { title: "Troubleshooting", href: `${mdBase}/docs/troubleshooting.md`, description: "Common live-mode, DNS, API key, and webhook fixes" },
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
    { path: "/about.md", title: "About ClientPad" },
    { path: "/cloud.md", title: "ClientPad Cloud" },
    { path: "/pricing.md", title: "ClientPad Pricing" },
    { path: "/developers.md", title: "ClientPad for Developers" },
    { path: "/whatsapp.md", title: "WhatsApp Operations" },
    { path: "/open-source.md", title: "Open Source" },
    { path: "/security.md", title: "Security" },
    { path: "/contact.md", title: "Contact" },
    { path: "/privacy.md", title: "Privacy" },
    { path: "/terms.md", title: "Terms" },
    { path: "/docs/index.md", title: "ClientPad Docs" },
    { path: "/docs/quickstart.md", title: "Quickstart" },
    { path: "/docs/sdk.md", title: "TypeScript SDK" },
    { path: "/docs/whatsapp-magic.md", title: "WhatsApp Magic" },
    { path: "/docs/public-api.md", title: "Public API" },
    { path: "/docs/self-hosting.md", title: "Self-hosting" },
    { path: "/docs/open-source.md", title: "Open-Source Architecture" },
    { path: "/docs/clientpad-cloud.md", title: "ClientPad Cloud" },
    { path: "/docs/environment.md", title: "Environment Variables" },
    { path: "/docs/deployment.md", title: "Deployment" },
    { path: "/docs/troubleshooting.md", title: "Troubleshooting" },
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
  const host = String(req.headers.host || "");
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

  const normalizedUrl = host.startsWith("docs.") && (url === "/" || url === "/index.html") ? "/docs" : url;
  const { path: rawPath, ext } = normalizePathKeepExt(normalizedUrl);
  const path = rawPath === "/index" ? "/" : rawPath;
  const isDirectMdRequest = ext === ".md";

  // Serve static public assets used by rendered HTML.
  const staticContentType = getStaticContentType(path);
  if (staticContentType) {
    const absolutePath = resolvePublicFile(path);
    if (!absolutePath) {
      serveError(res, 404, "Not found");
      return;
    }
    const asset = await tryReadAsset(absolutePath);
    if (asset) {
      res.writeHead(200, {
        "content-type": staticContentType,
        "cache-control": path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=3600",
      });
      res.end(asset);
      return;
    }
  }

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
