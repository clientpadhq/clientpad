# Publishing ClientPad

ClientPad's npm packages are `@clientpad/core`, `@clientpad/cli`, `@clientpad/sdk`, and `@clientpad/server`.

## Pre-Publish Checklist

1. Confirm the package scope exists on npm: `@clientpad`.
2. Confirm the package graph has no hosted backend or removed app-framework dependencies:

   ```bash
   Select-String -Path package.json,packages/*/package.json,pnpm-lock.yaml -Pattern "supabase|@supabase|next@|react@"
   ```

3. Run checks:

   ```bash
   pnpm install
   npm run typecheck
   node packages/cli/bin/clientpad.mjs help
   npm run build
   ```

4. Inspect the tarball contents:

   ```bash
   npm pack --workspace @clientpad/core --dry-run
   npm pack --workspace @clientpad/cli --dry-run
   npm pack --workspace @clientpad/sdk --dry-run
   npm pack --workspace @clientpad/server --dry-run
   ```

5. Publish:

   ```bash
   pnpm --filter @clientpad/core publish --access public
   pnpm --filter @clientpad/cli publish --access public
   pnpm --filter @clientpad/sdk publish --access public
   pnpm --filter @clientpad/server publish --access public
   ```

## GitHub Release

Tag releases with the package version:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Attach release notes that describe CLI commands, migrations, and breaking schema changes.
