# ClientPad Infrastructure Plan

ClientPad is being built as open-source infrastructure that businesses and developers can run, inspect, fork, and embed in their own applications.

## Product Direction

- No subscription plans, paid feature gates, trial expiry, seat caps, or upgrade prompts in the codebase.
- PostgreSQL is the default database layer.
- API keys are the gateway for integrations, automations, SDK access, and third-party apps.
- Packages should be dependency-light and usable outside any single web framework.
- The repository should be ready for GitHub releases and npm publishing under the `@clientpad` scope.

## Current Package Surface

- `@abdulmuiz44/clientpad-core`
  - Shared TypeScript types.
  - API response shapes.
  - URL, bearer-token, prefix, and status helpers.
  - No runtime dependencies.

- `@abdulmuiz44/clientpad-cli`
  - `clientpad init`
  - `clientpad migrate`
  - `clientpad api-key create`
  - SQL migrations shipped with the package.

- `@abdulmuiz44/clientpad-server`
  - Fetch-standard public API handler.
  - API key verification.
  - Workspace-scoped lead and client endpoints.
  - PostgreSQL-backed storage.

- `@abdulmuiz44/clientpad-sdk`
  - `ClientPad` class.
  - `leads.list`, `leads.create`.
  - `clients.list`, `clients.create`.
  - Native `fetch` with injectable fetch for tests and custom runtimes.
  - Typed `ClientPadError` for non-2xx responses.

## Release 0.1.0 Scope

1. Publish the source code to GitHub as an open-source infrastructure repository.
2. Attach package tarballs for:
   - `@abdulmuiz44/clientpad-core`
   - `@abdulmuiz44/clientpad-cli`
   - `@abdulmuiz44/clientpad-sdk`
   - `@abdulmuiz44/clientpad-server`
3. Document the local install, migration, API key, SDK, and server handler flows.
4. Keep the first public API intentionally small: leads and clients.
5. Verify there are no hosted backend, app-framework, or subscription-billing dependencies in the publishable package graph.

## Next Implementation Areas

1. Add an OpenAPI document for `/api/public/v1`.
2. Add generated examples for Express, Hono, Fastify, and Next route handlers.
3. Add Docker Compose for local PostgreSQL development.
4. Add auth/session packages for app-owned user login.
5. Expand public APIs to deals, invoices, jobs, tasks, and activities.
6. Add CI for install, typecheck, tests, package dry-run, and dependency scan.
7. Publish packages to the npm registry once the `@clientpad` npm organization is available.

## Operating Principle

ClientPad should become the infrastructure layer that lets any business build revenue, operations, and customer workflows on top of open-source primitives.
