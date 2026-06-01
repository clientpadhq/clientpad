import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const DIST_DIR = __dirname;
const BASE_URL = process.env.MARKETING_BASE_URL || "https://clientpad.xyz";
const SITE_VARIANT = process.env.CLIENTPAD_SITE_VARIANT === "docs" ? "docs" : "marketing";
const IS_DOCS_VARIANT = SITE_VARIANT === "docs";

const pages = [
  { path: "/", html: "index.html", md: "index.md", title: "ClientPad" },
  { path: "/about", html: "about.html", md: "about.md", title: "About ClientPad" },
  { path: "/cloud", html: "cloud.html", md: "cloud.md", title: "ClientPad Cloud" },
  { path: "/pricing", html: "pricing.html", md: "pricing.md", title: "ClientPad Pricing" },
  { path: "/developers", html: "developers.html", md: "developers.md", title: "ClientPad for Developers" },
  { path: "/whatsapp", html: "whatsapp.html", md: "whatsapp.md", title: "WhatsApp Operations" },
  { path: "/open-source", html: "open-source.html", md: "open-source.md", title: "Open Source" },
  { path: "/security", html: "security.html", md: "security.md", title: "Security" },
  { path: "/contact", html: "contact.html", md: "contact.md", title: "Contact" },
  { path: "/privacy", html: "privacy.html", md: "privacy.md", title: "Privacy" },
  { path: "/terms", html: "terms.html", md: "terms.md", title: "Terms" },
  { path: "/docs", html: "docs/index.html", md: "docs/index.md", title: "ClientPad Docs" },
  { path: "/docs/quickstart", html: "docs/quickstart.html", md: "docs/quickstart.md", title: "Quickstart" },
  { path: "/docs/sdk", html: "docs/sdk.html", md: "docs/sdk.md", title: "TypeScript SDK" },
  { path: "/docs/whatsapp-magic", html: "docs/whatsapp-magic.html", md: "docs/whatsapp-magic.md", title: "WhatsApp Magic" },
  { path: "/docs/public-api", html: "docs/public-api.html", md: "docs/public-api.md", title: "Public API" },
  { path: "/docs/self-hosting", html: "docs/self-hosting.html", md: "docs/self-hosting.md", title: "Self-hosting" },
  { path: "/docs/open-source", html: "docs/open-source.html", md: "docs/open-source.md", title: "Open-Source Architecture" },
  { path: "/docs/clientpad-cloud", html: "docs/clientpad-cloud.html", md: "docs/clientpad-cloud.md", title: "ClientPad Cloud" },
  { path: "/docs/environment", html: "docs/environment.html", md: "docs/environment.md", title: "Environment Variables" },
  { path: "/docs/deployment", html: "docs/deployment.html", md: "docs/deployment.md", title: "Deployment" },
  { path: "/docs/troubleshooting", html: "docs/troubleshooting.html", md: "docs/troubleshooting.md", title: "Troubleshooting" },
];

function buildLlmsTxt() {
  const title = IS_DOCS_VARIANT ? "ClientPad Docs" : "ClientPad";
  const intro = IS_DOCS_VARIANT
    ? "ClientPad documentation for quickstart, SDK, API keys, self-hosting, Cloud setup, WhatsApp, deployment, and troubleshooting."
    : "ClientPad is open-source infrastructure for WhatsApp-first lead capture, client workflows, API keys, usage tracking, and operator dashboards.";
  const homeLabel = IS_DOCS_VARIANT ? "Docs Home" : "ClientPad Home";

  return `# ${title}

> ${intro}

## Product

- [${homeLabel}](${BASE_URL}/index.md): Product overview, package links, and quick start
- [About ClientPad](${BASE_URL}/about.md): Mission, positioning, and open-source business model
- [ClientPad Cloud](${BASE_URL}/docs/clientpad-cloud.md): Hosted gateway, dashboard, usage tracking, and billing-ready operations
- [Pricing](${BASE_URL}/pricing.md): Open-source and hosted Cloud pricing model

## Documentation

- [Docs Home](${BASE_URL}/docs/index.md): Documentation entry point
- [Quickstart](${BASE_URL}/docs/quickstart.md): Install and create the first lead
- [SDK](${BASE_URL}/docs/sdk.md): TypeScript SDK usage
- [WhatsApp Magic](${BASE_URL}/docs/whatsapp-magic.md): WhatsApp lead capture, inbox, payments, and pipeline operations
- [Public API](${BASE_URL}/docs/public-api.md): REST API and TypeScript SDK usage
- [Self-hosting](${BASE_URL}/docs/self-hosting.md): Run ClientPad with your own PostgreSQL and deployment
- [Open-Source Architecture](${BASE_URL}/docs/open-source.md): Packages, database approach, auth, and deployment model
- [Deployment](${BASE_URL}/docs/deployment.md): Domain and Render deployment guide
- [Troubleshooting](${BASE_URL}/docs/troubleshooting.md): Common live-mode, DNS, API key, and webhook fixes

## Links

- [Dashboard](https://app.clientpad.xyz)
- [Docs](https://docs.clientpad.xyz)
- [GitHub](https://github.com/clientpadhq/clientpad)
- [npm packages](https://www.npmjs.com/search?q=%40clientpad)
`;
}

async function buildLlmsFullTxt() {
  let output = "";

  for (const page of pages) {
    const markdown = await readFile(join(PUBLIC_DIR, page.md), "utf-8");
    output += `# ${page.title}\n\n${markdown}\n\n---\n\n`;
  }

  return output;
}

function buildSitemap() {
  const urls = pages.map((page) => {
    const loc = page.path === "/" ? BASE_URL : `${BASE_URL}${page.path}`;
    return `  <url><loc>${loc}</loc></url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

function buildRedirects() {
  const cleanRoutes = pages
    .filter((page) => page.path !== "/")
    .map((page) => `${page.path} /${page.html} 200`)
    .join("\n");

  const docsHostRoutes = pages
    .map((page) => `https://docs.clientpad.xyz${page.path} /${page.html} 200!`)
    .join("\n");

  return `${docsHostRoutes}\n${cleanRoutes}\n`;
}

async function main() {
  await mkdir(DIST_DIR, { recursive: true });
  await cp(PUBLIC_DIR, DIST_DIR, { recursive: true, force: true });

  if (IS_DOCS_VARIANT) {
    await cp(join(PUBLIC_DIR, "docs", "index.html"), join(DIST_DIR, "index.html"), { force: true });
    await cp(join(PUBLIC_DIR, "docs", "index.md"), join(DIST_DIR, "index.md"), { force: true });
  }

  await writeFile(join(DIST_DIR, "llms.txt"), buildLlmsTxt(), "utf-8");
  await writeFile(join(DIST_DIR, "llms-full.txt"), await buildLlmsFullTxt(), "utf-8");
  await writeFile(join(DIST_DIR, "sitemap.xml"), buildSitemap(), "utf-8");
  await writeFile(join(DIST_DIR, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/sitemap.xml\n`, "utf-8");
  await writeFile(
    join(DIST_DIR, "_headers"),
    `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY

/llms.txt
  Content-Type: text/markdown; charset=utf-8
  X-Robots-Tag: noindex

/llms-full.txt
  Content-Type: text/markdown; charset=utf-8
  X-Robots-Tag: noindex

/*.md
  Content-Type: text/markdown; charset=utf-8
  X-Robots-Tag: noindex
`,
    "utf-8",
  );
  await writeFile(join(DIST_DIR, "_redirects"), buildRedirects(), "utf-8");

  console.log(`ClientPad marketing static site exported to ${DIST_DIR}`);
}

await main();
