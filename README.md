<div align="center">

# Woku SDKs

Official SDKs for [Woku](https://woku.app): manage your account from a backend
with the management SDK, and capture customer feedback inside your own products.

</div>

This is a monorepo. Each SDK is an independently versioned package published
under the [`@wokuapp`](https://www.npmjs.com/org/wokuapp) npm scope.

## Packages

| Package                                            | Description                                                                                                                                                      | Version                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [`@wokuapp/sdk`](./packages/sdk)                   | **Server-side** SDK for the Woku management API (`/v1`): trackers, VoC tools (NPS/CSAT/CES), wokus, forms, flows, action plans, tickets, dispatches and sends. Typed, retrying, auto-paginated. | ![npm](https://img.shields.io/npm/v/@wokuapp/sdk)          |
| [`@wokuapp/react-native`](./packages/react-native) | React Native SDK to capture Woku ratings and NPS (text + audio) inside iOS and Android apps, with offline buffering and configurable intercepts.                 | ![npm](https://img.shields.io/npm/v/@wokuapp/react-native) |
| [`@wokuapp/woku-widget`](./packages/woku-widget)   | Embeddable web widget to capture Woku and NPS feedback on a website.                                                                                             | ![npm](https://img.shields.io/npm/v/@wokuapp/woku-widget)  |

There is also an official Python management SDK, [`woku`](https://pypi.org/project/woku/),
in the separate [`woku-python`](https://github.com/wokuApp/woku-python) repository.

## Repository layout

```
sdks/
├── packages/
│   ├── sdk/               @wokuapp/sdk (management, server-side)
│   ├── react-native/      @wokuapp/react-native (capture, mobile)
│   └── woku-widget/       @wokuapp/woku-widget (capture, web)
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
