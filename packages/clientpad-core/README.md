# @abdulmuiz44/clientpad-core

## What this package is

A small core metadata and utilities package for ClientPad.

## What this package is not

This is not the full ClientPad app. It only contains shared package metadata and small utilities for ClientPad consumers.

## Install

```sh
npm install @abdulmuiz44/clientpad-core
```

## Import example

```ts
import {
  CLIENTPAD_APP_NAME,
  CLIENTPAD_CORE_PACKAGE_NAME,
  CLIENTPAD_CORE_VERSION,
  CLIENTPAD_PACKAGE_NAME,
  getClientPadPackageInfo,
  type ClientPadPackageInfo,
} from "@abdulmuiz44/clientpad-core";

const packageInfo: ClientPadPackageInfo = getClientPadPackageInfo();

console.log(CLIENTPAD_APP_NAME);
console.log(CLIENTPAD_PACKAGE_NAME);
console.log(CLIENTPAD_CORE_PACKAGE_NAME);
console.log(CLIENTPAD_CORE_VERSION);
console.log(packageInfo);
```

## Build

Run from inside `packages/clientpad-core`:

```sh
npm run build
```

## Typecheck

Run from inside `packages/clientpad-core`:

```sh
npm run typecheck
```

## Dry run package contents

Run from the repo root:

```sh
npm pack ./packages/clientpad-core --dry-run
```

## Publish

With npm:

```sh
npm publish
```

With pnpm:

```sh
pnpm publish
```

## GitHub Packages authentication

Use a `GITHUB_TOKEN` when publishing to GitHub Packages:

```sh
npm config set //npm.pkg.github.com/:_authToken GITHUB_TOKEN
```
