#!/usr/bin/env node

import process from "node:process";

const checks = [
  {
    name: "marketing-root",
    url: process.env.CLIENTPAD_MARKETING_URL || "https://clientpad.xyz/",
    expectStatus: 200,
    bodyIncludes: ["<title>ClientPad", "/site.css", "/site.js"],
  },
  {
    name: "docs-root",
    url: process.env.CLIENTPAD_DOCS_URL || "https://docs.clientpad.xyz/",
    expectStatus: 200,
    bodyIncludes: ["<title>ClientPad Docs", "/site.css", "/site.js"],
  },
  {
    name: "docs-open-source",
    url: process.env.CLIENTPAD_DOCS_OPEN_SOURCE_URL || "https://docs.clientpad.xyz/docs/open-source",
    expectStatus: 200,
    bodyIncludes: ["Open-Source", "/site.css", "/site.js"],
  },
  {
    name: "platform-root",
    url: process.env.CLIENTPAD_PLATFORM_URL || process.env.CLIENTPAD_APP_URL || "https://platform.clientpad.xyz/",
    expectStatus: 200,
    bodyIncludes: ["ClientPad", "id=\"root\""],
  },
  {
    name: "api-health",
    url: process.env.CLIENTPAD_API_HEALTH_URL || "https://api.clientpad.xyz/health",
    expectStatus: 200,
    jsonFields: ["status", "service", "time"],
  },
];

const criticalFooterLinks = [
  'href="/docs"',
  'href="https://github.com/clientpadhq/clientpad"',
  'href="https://github.com/Abdulmuiz44"',
  'href="/privacy"',
  'href="/terms"',
  'href="/llms.txt"',
];

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  return response;
}

async function runCheck(check) {
  const response = await fetchText(check.url);
  const result = {
    name: check.name,
    url: check.url,
    status: response.status,
    ok: true,
    errors: [],
  };

  if (response.status !== check.expectStatus) {
    result.ok = false;
    result.errors.push(`expected status ${check.expectStatus}, received ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = await response.text();

  if (check.bodyIncludes) {
    for (const marker of check.bodyIncludes) {
      if (!body.includes(marker)) {
        result.ok = false;
        result.errors.push(`missing body marker: ${marker}`);
      }
    }
  }

  if (check.jsonFields) {
    if (!isJson) {
      result.ok = false;
      result.errors.push(`expected JSON response, got content-type "${contentType || "unknown"}"`);
    } else {
      try {
        const payload = JSON.parse(body);
        for (const field of check.jsonFields) {
          if (!(field in payload)) {
            result.ok = false;
            result.errors.push(`missing JSON field: ${field}`);
          }
        }
      } catch {
        result.ok = false;
        result.errors.push("invalid JSON body");
      }
    }
  }

  return result;
}

async function verifyFooterLinks() {
  const base = new URL(process.env.CLIENTPAD_MARKETING_URL || "https://clientpad.xyz/");
  const response = await fetchText(new URL("/site.js", base).toString());
  const source = await response.text();
  const failures = [];
  for (const link of criticalFooterLinks) {
    if (!source.includes(link)) failures.push(`marketing footer missing ${link}`);
  }
  return failures;
}

async function main() {
  const results = [];
  for (const check of checks) {
    try {
      results.push(await runCheck(check));
    } catch (error) {
      results.push({
        name: check.name,
        url: check.url,
        status: "error",
        ok: false,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  const footerFailures = await verifyFooterLinks();
  if (footerFailures.length) {
    results.push({
      name: "marketing-footer-links",
      url: process.env.CLIENTPAD_MARKETING_URL || "https://clientpad.xyz/",
      status: "n/a",
      ok: false,
      errors: footerFailures,
    });
  }

  let hasFailures = false;
  for (const result of results) {
    const marker = result.ok ? "PASS" : "FAIL";
    console.log(`${marker}\t${result.name}\t${result.url}\tstatus=${result.status}`);
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
    if (!result.ok) hasFailures = true;
  }

  if (hasFailures) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
