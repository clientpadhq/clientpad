# Publishing ClientPad

ClientPad's npm packages are `@abdulmuiz44/clientpad-core`, `@abdulmuiz44/clientpad-cli`, `@abdulmuiz44/clientpad-sdk`, `@abdulmuiz44/clientpad-server`, `@abdulmuiz44/clientpad-cloud`, and `@abdulmuiz44/clientpad-dashboard`.

## Pre-Publish Checklist

1. Confirm the package scope exists on npm: `@clientpad`.
2. Confirm the package graph has no hosted backend or removed app-framework dependencies. React is allowed for `@abdulmuiz44/clientpad-dashboard`.

   ```bash
   Select-String -Path package.json,packages/*/package.json,pnpm-lock.yaml -Pattern "supabase|@supabase|next@"
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
   npm pack --workspace @abdulmuiz44/clientpad-core --dry-run
   npm pack --workspace @abdulmuiz44/clientpad-cli --dry-run
   npm pack --workspace @abdulmuiz44/clientpad-sdk --dry-run
   npm pack --workspace @abdulmuiz44/clientpad-server --dry-run
   npm pack --workspace @abdulmuiz44/clientpad-cloud --dry-run
   npm pack --workspace @abdulmuiz44/clientpad-dashboard --dry-run
   ```

5. Publish:

   ```bash
   pnpm --filter @abdulmuiz44/clientpad-core publish --access public
   pnpm --filter @abdulmuiz44/clientpad-cli publish --access public
   pnpm --filter @abdulmuiz44/clientpad-sdk publish --access public
   pnpm --filter @abdulmuiz44/clientpad-server publish --access public
   pnpm --filter @abdulmuiz44/clientpad-cloud publish --access public
   pnpm --filter @abdulmuiz44/clientpad-dashboard publish --access public
   ```

## GitHub Release

Tag releases with the package version:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Attach release notes that describe CLI commands, migrations, and breaking schema changes.
