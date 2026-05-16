import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const DIST_DIR = __dirname;
const BASE_URL = process.env.MARKETING_BASE_URL || "https://clientpad.xyz";

const pages = [
  { path: "/", html: "index.html", md: "index.md", title: "ClientPad" },
  { path: "/docs/whatsapp-magic", html: "docs/whatsapp-magic.html", md: "docs/whatsapp-magic.md", title: "WhatsApp Magic" },
  { path: "/docs/public-api", html: "docs/public-api.html", md: "docs/public-api.md", title: "Public API" },
  { path: "/docs/open-source", html: "docs/open-source.html", md: "docs/open-source.md", title: "Open-Source Architecture" },
  { path: "/docs/clientpad-cloud", html: "docs/clientpad-cloud.html", md: "docs/clientpad-cloud.md", title: "ClientPad Cloud" },
];

function buildLlmsTxt() {
  return `# ClientPad

> ClientPad is open-source infrastructure for WhatsApp-first lead capture, client workflows, API keys, usage tracking, and operator dashboards.

## Product

- [ClientPad Home](${BASE_URL}/index.md): Product overview, package links, and quick start
- [ClientPad Cloud](${BASE_URL}/docs/clientpad-cloud.md): Hosted gateway, dashboard, usage tracking, and billing-ready operations

## Documentation

- [WhatsApp Magic](${BASE_URL}/docs/whatsapp-magic.md): WhatsApp lead capture, inbox, payments, and pipeline operations
- [Public API](${BASE_URL}/docs/public-api.md): REST API and TypeScript SDK usage
- [Open-Source Architecture](${BASE_URL}/docs/open-source.md): Packages, database approach, auth, and deployment model

## Links

- [Dashboard](https://app.clientpad.xyz)
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
  return pages
    .filter((page) => page.path !== "/")
    .map((page) => `${page.path} /${page.html} 200`)
    .join("\n")
    .concat("\n");
}

async function main() {
  await mkdir(DIST_DIR, { recursive: true });
  await cp(PUBLIC_DIR, DIST_DIR, { recursive: true, force: true });

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
