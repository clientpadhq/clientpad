#!/usr/bin/env node

import process from "node:process";

const API_ORIGIN = (process.env.CLIENTPAD_API_ORIGIN || "https://api.clientpad.xyz").replace(/\/+$/, "");
const PUBLIC_API_KEY = process.env.CLIENTPAD_PUBLIC_API_KEY || "";

async function request(path, init = {}) {
  try {
    const response = await fetch(`${API_ORIGIN}${path}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      ...init,
    });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { response, text, json };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${path} fetch failed: ${message}`);
  }
}

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  const checks = [];

  const hostHealth = await request("/health");
  ensure(hostHealth.response.status === 200, `/health returned ${hostHealth.response.status}`);
  ensure(hostHealth.json && typeof hostHealth.json.status === "string", "/health missing JSON status");
  checks.push(`PASS /health status=${hostHealth.json.status}`);

  const cloudHealth = await request("/api/cloud/v1/health");
  ensure(cloudHealth.response.status === 200, `/api/cloud/v1/health returned ${cloudHealth.response.status}`);
  ensure(cloudHealth.json && cloudHealth.json.status === "ok", "/api/cloud/v1/health did not return status=ok");
  checks.push("PASS /api/cloud/v1/health");

  const authStatus = await request("/api/cloud/v1/auth/status");
  ensure(authStatus.response.status === 200, `/api/cloud/v1/auth/status returned ${authStatus.response.status}`);
  ensure(authStatus.json && typeof authStatus.json.registration_open === "boolean", "/api/cloud/v1/auth/status missing registration_open");
  checks.push("PASS /api/cloud/v1/auth/status");

  const readiness = await request("/api/cloud/v1/readiness");
  ensure(
    readiness.response.status === 401 || readiness.response.status === 403 || readiness.response.status === 200,
    `/api/cloud/v1/readiness unexpected status ${readiness.response.status}`
  );
  checks.push(`PASS /api/cloud/v1/readiness status=${readiness.response.status}`);

  const publicUsageNoKey = await request("/api/public/v1/usage");
  ensure(publicUsageNoKey.response.status === 401, `/api/public/v1/usage (no key) expected 401, got ${publicUsageNoKey.response.status}`);
  checks.push("PASS /api/public/v1/usage rejects missing key");

  if (PUBLIC_API_KEY) {
    const authedUsage = await request("/api/public/v1/usage", {
      headers: {
        Authorization: `Bearer ${PUBLIC_API_KEY}`,
      },
    });
    ensure(authedUsage.response.status === 200, `/api/public/v1/usage (with key) returned ${authedUsage.response.status}`);
    ensure(authedUsage.json && Array.isArray(authedUsage.json.data), "/api/public/v1/usage missing data array");
    checks.push("PASS /api/public/v1/usage accepts provided key");

    const burst = [];
    for (let index = 0; index < 5; index += 1) {
      const probe = await request("/api/public/v1/usage", {
        headers: { Authorization: `Bearer ${PUBLIC_API_KEY}` },
      });
      burst.push(probe.response.status);
    }
    const hasServerFailure = burst.some((status) => status >= 500);
    ensure(!hasServerFailure, `rate-limit burst had 5xx response: ${burst.join(",")}`);
    checks.push(`PASS rate-limit burst status sequence=${burst.join(",")}`);
  } else {
    checks.push("SKIP authenticated key flow and rate-limit burst (CLIENTPAD_PUBLIC_API_KEY not set)");
  }

  for (const line of checks) console.log(line);
}

run().catch((error) => {
  console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
