#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const target = (process.argv[2] || "help").toLowerCase();

const pagesBranch = process.env.CLOUDFLARE_PAGES_BRANCH || "main";
const marketingProject = process.env.CLOUDFLARE_MARKETING_PROJECT || "clientpad-marketing";
const dashboardProject = process.env.CLOUDFLARE_DASHBOARD_PROJECT || "clientpad-dashboard";

function run(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
      ...opts,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function printUsage() {
  console.log(`
Cloudflare deploy helper

Usage:
  node scripts/deploy-cloudflare.mjs <target>

Targets:
  api         Deploy Cloudflare Worker from deploy/cloudflare/api-pages
  marketing   Build and deploy marketing site to Cloudflare Pages
  dashboard   Build and deploy dashboard site to Cloudflare Pages
  pages       Deploy both marketing + dashboard Pages projects
  all         Deploy api + marketing + dashboard
  init        Create Cloudflare Pages projects (if they do not exist)

Environment variables:
  CLOUDFLARE_API_TOKEN        (recommended for non-interactive deploys)
  CLOUDFLARE_ACCOUNT_ID       (recommended for non-interactive deploys)
  CLOUDFLARE_PAGES_BRANCH     default: main
  CLOUDFLARE_MARKETING_PROJECT default: clientpad-marketing
  CLOUDFLARE_DASHBOARD_PROJECT default: clientpad-dashboard
`);
}

function warnIfMissingCloudflareAuth() {
  const hasToken = Boolean(process.env.CLOUDFLARE_API_TOKEN);
  const hasAccount = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID);
  if (!hasToken || !hasAccount) {
    console.warn(
      "Warning: CLOUDFLARE_API_TOKEN and/or CLOUDFLARE_ACCOUNT_ID are missing. Wrangler may prompt for interactive auth."
    );
  }
}

async function deployApi() {
  await run("pnpm", [
    "dlx",
    "wrangler@4",
    "deploy",
    "--config",
    "deploy/cloudflare/api-pages/wrangler.toml",
  ]);
}

async function deployMarketing() {
  await run("pnpm", ["--filter", "@clientpad/marketing", "build"]);
  await run("pnpm", [
    "dlx",
    "wrangler@4",
    "pages",
    "deploy",
    "packages/marketing/dist",
    "--project-name",
    marketingProject,
    "--branch",
    pagesBranch,
  ]);
}

async function deployDashboard() {
  await run("pnpm", ["--filter", "@clientpad/core", "build"]);
  await run("pnpm", ["--filter", "@clientpad/sdk", "build"]);
  await run("pnpm", ["--filter", "@clientpad/dashboard", "build"]);
  await run("pnpm", [
    "dlx",
    "wrangler@4",
    "pages",
    "deploy",
    "packages/dashboard/dist",
    "--project-name",
    dashboardProject,
    "--branch",
    pagesBranch,
  ]);
}

async function initPages() {
  await run("pnpm", [
    "dlx",
    "wrangler@4",
    "pages",
    "project",
    "create",
    marketingProject,
    "--production-branch",
    pagesBranch,
  ]);
  await run("pnpm", [
    "dlx",
    "wrangler@4",
    "pages",
    "project",
    "create",
    dashboardProject,
    "--production-branch",
    pagesBranch,
  ]);
}

async function main() {
  if (target === "help" || target === "--help" || target === "-h") {
    printUsage();
    return;
  }

  warnIfMissingCloudflareAuth();

  switch (target) {
    case "api":
      await deployApi();
      break;
    case "marketing":
      await deployMarketing();
      break;
    case "dashboard":
      await deployDashboard();
      break;
    case "pages":
      await deployMarketing();
      await deployDashboard();
      break;
    case "all":
      await deployApi();
      await deployMarketing();
      await deployDashboard();
      break;
    case "init":
      await initPages();
      break;
    default:
      printUsage();
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
