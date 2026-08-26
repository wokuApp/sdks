# Woku SDKs (monorepo) — agent conventions

pnpm monorepo of the official `@wokuapp` SDKs: `sdk` (server-side management SDK),
`react-native` and `woku-widget` (capture). Node >= 18.

## Keep the READMEs current (hard rule)

Any change to a package's public surface or behavior (methods added or removed,
examples, options, versions) MUST update the READMEs **in the same change**:

- the **package README** (`packages/<pkg>/README.md`, the one npm renders), and
- the **repo-root README** (`README.md`, the package table and layout).

The npm page freezes the README at publish time, so a README fix needs a new
patch version to reach the package page; the GitHub README updates on merge.
Never ship an SDK change that leaves an example or a listed method stale.

## Workflow

- Package manager: **pnpm** only. Gate before any PR: `pnpm lint`,
  `pnpm typecheck`, `pnpm test:run`, `pnpm --filter @wokuapp/sdk build`,
  `pnpm --filter @wokuapp/sdk check:publint`, `pnpm --filter @wokuapp/sdk check:exports`.
- Versioning: **changesets** (`pnpm changeset`, one file per change). On merge to
  `main` the release opens a "Version Packages" PR. Code, comments and commits in
  English.
- Never present integrations that are not in production (only Shopify and Zendesk
  are). No `actionPlans.send` to Jira/Monday/ClickUp/Notion; ticket destinations
  are zendesk/custom/email only.
