# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).

When you make a change that should ship in a release, run:

```bash
pnpm changeset
```

Pick the affected package(s) and the semver bump (patch / minor / major),
and write a short summary. The changeset file you create is committed with
your PR. On merge to `main`, the release workflow opens a "Version Packages"
PR that bumps versions + updates changelogs; merging that PR publishes to npm.
