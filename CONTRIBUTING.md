# Contributing

Thanks for contributing to the Woku SDKs.

## Setup

```bash
pnpm install
```

## Workflow

1. Create a branch from `main`.
2. Make your change in the relevant package under `packages/`.
3. Keep it green: `pnpm typecheck && pnpm lint && pnpm test:run && pnpm build`.
4. Add a changeset describing the change and its semver impact:
   ```bash
   pnpm changeset
   ```
5. Open a PR. CI runs typecheck, lint, tests and build.

## Conventions

- TypeScript, strict mode. Public APIs are fully typed and documented.
- The SDK core is framework-agnostic and depends on injectable adapters
  (storage, http, audio) so it stays unit-testable. Keep platform-specific
  code in thin adapters.
- One responsibility per commit; clear messages.

## Releases

Maintainers merge the changesets "Version Packages" PR to publish to npm.
