#!/usr/bin/env node

import process from "node:process";

const target = (process.argv[2] || "help").toLowerCase();
const clearCache = process.argv.includes("--clear-cache");

const API_BASE = "https://api.render.com/v1";

const SERVICE_NAMES = {
  api: process.env.RENDER_API_SERVICE_NAME || "clientpad-api",
  frontend: process.env.RENDER_FRONTEND_SERVICE_NAME || "clientpad-frontend",
  docs: process.env.RENDER_DOCS_SERVICE_NAME || "clientpad-docs",
  app: process.env.RENDER_APP_SERVICE_NAME || "clientpad-app",
};

function usage() {
  console.log(`
Render deploy helper

Usage:
  node scripts/deploy-render.mjs <target> [--clear-cache]

Targets:
  list      List services visible to this API key
  api       Trigger deploy for ${SERVICE_NAMES.api}
  frontend  Trigger deploy for ${SERVICE_NAMES.frontend}
  docs      Trigger deploy for ${SERVICE_NAMES.docs}
  app       Trigger deploy for ${SERVICE_NAMES.app}
  all       Trigger deploys for api + frontend + docs + app

Required env:
  RENDER_API_KEY
`);
}

function authHeaders() {
  if (!process.env.RENDER_API_KEY) {
    throw new Error("Missing RENDER_API_KEY.");
  }
  return {
    Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function request(path, init = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Render API ${response.status} ${response.statusText} on ${path}: ${body}`);
  }

  return response.json();
}

async function listServices() {
  const records = await request("/services?limit=100");
  for (const record of records) {
    const service = record.service;
    if (!service) continue;
    console.log(`${service.name}\t${service.id}\t${service.type}\t${service.suspended}`);
  }
  return records;
}

async function findServiceIdByName(name) {
  const records = await request(`/services?limit=100&name=${encodeURIComponent(name)}`);
  const hit = records.find((record) => record.service?.name === name);
  if (!hit?.service?.id) {
    throw new Error(`Render service "${name}" not found.`);
  }
  return hit.service.id;
}

async function triggerDeployByName(name) {
  const serviceId = await findServiceIdByName(name);
  const body = clearCache ? { clearCache: "clear" } : {};
  const deploy = await request(`/services/${serviceId}/deploys`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const deployId = deploy.id || deploy.deploy?.id || "unknown";
  const status = deploy.status || deploy.deploy?.status || "unknown";
  console.log(`${name}\t${serviceId}\t${deployId}\t${status}`);
}

async function main() {
  if (target === "help" || target === "-h" || target === "--help") {
    usage();
    return;
  }

  switch (target) {
    case "list":
      await listServices();
      return;
    case "api":
      await triggerDeployByName(SERVICE_NAMES.api);
      return;
    case "frontend":
      await triggerDeployByName(SERVICE_NAMES.frontend);
      return;
    case "docs":
      await triggerDeployByName(SERVICE_NAMES.docs);
      return;
    case "app":
      await triggerDeployByName(SERVICE_NAMES.app);
      return;
    case "all":
      await triggerDeployByName(SERVICE_NAMES.api);
      await triggerDeployByName(SERVICE_NAMES.frontend);
      await triggerDeployByName(SERVICE_NAMES.docs);
      await triggerDeployByName(SERVICE_NAMES.app);
      return;
    default:
      usage();
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
