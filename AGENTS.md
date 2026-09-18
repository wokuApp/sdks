# Woku SDKs (monorepo)

Conventions for this repo live in [AGENTS.md](./AGENTS.md). Read it first.

Hard rule highlighted: any change to a package's surface or behavior updates the
READMEs in the same change — the package README (`packages/<pkg>/README.md`, what
npm renders) **and** the repo-root `README.md`. A README fix needs a new patch
version to reach the npm page.
