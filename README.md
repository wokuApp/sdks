<div align="center">

# Woku SDKs

Official SDKs for integrating [Woku](https://woku.app) feedback capture into
your own products.

</div>

This is a monorepo. Each SDK is an independently versioned package published
under the [`@wokuapp`](https://www.npmjs.com/org/wokuapp) npm scope.

## Packages

| Package                                            | Description                                                                                                                                      | Version                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| [`@wokuapp/react-native`](./packages/react-native) | React Native SDK to capture Woku ratings and NPS (text + audio) inside iOS and Android apps, with offline buffering and configurable intercepts. | ![npm](https://img.shields.io/npm/v/@wokuapp/react-native) |

More SDKs (web widget, Node) will live here as additional packages.

## Repository layout

```
sdks/
├── packages/
│   └── react-native/      @wokuapp/react-native
├── .changeset/            versioning (changesets)
├── .github/workflows/     CI + release
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Development

Requires [pnpm](https://pnpm.io) and Node >= 18.

```bash
pnpm install        # install all workspace deps
pnpm build          # build every package
pnpm test:run       # run every package's tests once
pnpm typecheck      # type-check every package
pnpm lint           # lint every package
```

## Versioning & releases

Versioning uses [Changesets](https://github.com/changesets/changesets) and
[semantic versioning](https://semver.org). To record a change for the next
release:

```bash
pnpm changeset
```

On merge to `main`, the release workflow opens a "Version Packages" PR; merging
it bumps versions, updates changelogs, and publishes to npm.

## License

[MIT](./LICENSE) © Woku
