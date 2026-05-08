# Contributing to ClientPad

ClientPad is open-source infrastructure for business applications.

## Principles

- Keep the installable package fully open source.
- Do not add proprietary backend dependencies.
- Use PostgreSQL as the default database layer.
- Keep machine access behind workspace-scoped API keys.
- Prefer reusable infrastructure primitives over app-specific UI code.

## Development

Install dependencies:

```bash
pnpm install
```

Run checks:

```bash
npm run typecheck
node packages/cli/bin/clientpad.mjs help
npm run build
```

The package intended for npm is `packages/cli`, published as `@clientpad/cli`.

## Adding CLI Features

Add commands to:

```text
packages/cli/bin/clientpad.mjs
```

Package migrations and templates live in:

```text
packages/cli/migrations
packages/cli/templates
```

Keep package contents small and verify with:

```bash
npm run build
```
