# @abdulmuiz44/clientpad-core

## Purpose

`@abdulmuiz44/clientpad-core` is the small, publishable ClientPad core package for shared metadata and utility access.

This package is **not** the full ClientPad Next.js application. It does not bundle app routes, UI, database code, API handlers, environment configuration, or runtime files from the root app.

## Exports

The current public API is intentionally narrow and matches `src/index.ts` exactly:

- `CLIENTPAD_CORE_PACKAGE_NAME`
- `CLIENTPAD_APP_NAME`
- `ClientPadCoreInfo`
- `getClientPadCoreInfo()`

## Install

Configure GitHub Packages for the `@abdulmuiz44` scope before installing:

```sh
export GITHUB_TOKEN=<your_github_token>
npm config set @abdulmuiz44:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken ${GITHUB_TOKEN}
```

Install with npm:

```sh
npm install @abdulmuiz44/clientpad-core
```

Install with pnpm:

```sh
pnpm add @abdulmuiz44/clientpad-core
```

## Import example

```ts
import {
  CLIENTPAD_APP_NAME,
  CLIENTPAD_CORE_PACKAGE_NAME,
  getClientPadCoreInfo,
  type ClientPadCoreInfo,
} from "@abdulmuiz44/clientpad-core";

const coreInfo: ClientPadCoreInfo = getClientPadCoreInfo();

console.log(CLIENTPAD_APP_NAME);
console.log(CLIENTPAD_CORE_PACKAGE_NAME);
console.log(coreInfo.packageName);
console.log(coreInfo.appName);
```

## Build

Run from the repo root:

```sh
npm --prefix packages/clientpad-core run build
```

Or run from inside `packages/clientpad-core`:

```sh
npm run build
```

## Typecheck

Run from the repo root:

```sh
npm --prefix packages/clientpad-core run typecheck
```

Or run from inside `packages/clientpad-core`:

```sh
npm run typecheck
```

## Dry-run package contents

Run from the repo root before publishing:

```sh
npm pack ./packages/clientpad-core --dry-run
```

The package is configured to include only `dist`, this `README.md`, and package metadata.

## Publish

The root ClientPad repo is not published wholesale. Publish only this package after exporting a valid token:

```sh
export GITHUB_TOKEN=<your_github_token>
```

Publish with npm from the repo root:

```sh
npm publish ./packages/clientpad-core
```

Publish with pnpm from the repo root:

```sh
pnpm --dir packages/clientpad-core publish
```

The package `publishConfig` targets GitHub Packages at `https://npm.pkg.github.com`.
