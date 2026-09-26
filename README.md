<div align="center">

# Woku SDKs

Official SDKs for [Woku](https://woku.app): manage your account from a backend
with the management SDK, and capture customer feedback inside your own products.

</div>

This is a monorepo. Each SDK is an independently versioned package published
under the [`@wokuapp`](https://www.npmjs.com/org/wokuapp) npm scope.

## Packages

| Package                                            | Description                                                                                                                                                                                                        | Version                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| [`@wokuapp/sdk`](./packages/sdk)                   | **Server-side** SDK for the Woku management API (`/v1`): customer journeys, trackers, VoC tools (NPS/CSAT/CES), wokus, forms, flows, action plans, tickets, dispatches and sends. Typed, retrying, auto-paginated. | ![npm](https://img.shields.io/npm/v/@wokuapp/sdk)          |
| [`@wokuapp/react-native`](./packages/react-native) | React Native SDK to capture Woku/NPS (text + audio) and CSAT/CES scores inside iOS and Android apps, with offline buffering and configurable intercepts.                                                           | ![npm](https://img.shields.io/npm/v/@wokuapp/react-native) |
| [`@wokuapp/woku-widget`](./packages/woku-widget)   | Embeddable web widget to capture Woku and NPS feedback on a website.                                                                                                                                               | ![npm](https://img.shields.io/npm/v/@wokuapp/woku-widget)  |

There is also an official Python management SDK, [`woku`](https://pypi.org/project/woku/),
in the separate [`woku-python`](https://github.com/wokuApp/woku-python) repository.

Customer journey moments create their own CSAT, CES, NPS, or woku tools. Choose
`toolScope: 'shared'` (default for new v2 moments) or `'per_enrollment'` to
create one tool per participation. A shared tool stays within that same moment
and configuration. The authoring form suggests a 10-day wait for later moments;
the API still requires an explicit delay. In v2, `delayMs: 0` means a one-hour
wait. Configure question variables or the uploaded woku
image through `toolSpec`; existing tools cannot be assigned. See the
[management SDK example](./packages/sdk/README.md#customer-journeys).
Journey v2 adds operator, first-answer and webhook initiation, independent moment
connections, secondary wait fallbacks, optional ticket and plan actions with
independent recipients, and typed case
activity. Use `journeys.listEnrollments`, `getEnrollment` and `stopEnrollment` to
operate one exact case; `connections`, `mintMomentUrl`, `setSenderSecret` and
`previewMoment` configure and check its external systems without sending tests.
One enrollment key may complete the same journey repeatedly, with one active
cycle per journey at a time. `JourneyEnrollment` exposes `completed` and the
unsent `pendingMoments`.

For local agent media, the public API accepts multipart at `POST /v1/woku-media`
and returns a `fileId` for a Woku moment or the MCP `create_woku` tool. The JS
SDK exposes media.upload with a generated response type.
The upload endpoint returns `400` for invalid media and `413` for multipart
requests over 25 MB.

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

Advanced journey moments support `webhook.contentMode`, a bounded JSON `schema`,
`payload.clientFields`, conditional JavaScript text, localized variables, public
image URL paths, folders and tracker mappings. HTTP uses `sequence`; MCP uses
`cadence`. `Schemas` includes complete journey request and response shapes;
`JourneyMomentPreview` includes resolved content. A saved preview returns `200`
without verifying signatures or sending. Unknown HTTP and MCP moment fields now
return a validation error. `webhookSecret` is the legacy journey-wide signature,
separate from per-moment URL tokens and sender HMAC secrets.

`journeys.entryInfo` reads customer entry metadata; `journeys.prepareEntry`
prepares its first tool with a UUID request ID and identified contact. Neither
starts the journey. Pass the returned token as `dispatchToken` when capturing
its first valid answer. Journey reads, progress, previews, enrollment and event
results now use the generated public shapes directly. Server-side SDK keys
remain on the server; browser entry does not need a company secret key.

## Journey SDK v4

Upload local image/MP4 bytes with `woku.media.upload({ file, filename, contentType })`.
The result provides fileId for a Woku moment. Fetch supplies the multipart boundary;
uploads are not retried because this endpoint has no idempotency ledger. 413 is a
PayloadTooLargeError with the server requestId.

Iterate customer cases with `for await (const item of woku.journeys.iterEnrollments(id))`.
listEnrollments keeps its cursor envelope. Repeated cursors/pages raise code
pagination_error instead of looping.

Automatic write retries apply only to declared idempotent operations: tracker
creation, VoC-tool creation, invitations, journey creation/enrollment/stopping,
URL minting and journey events. Other writes are sent once. A key alone cannot
make an unsupported endpoint safe to retry. Errors expose idempotencyKey for
reconciling the original operation. Keep keys opaque and credential URLs out of logs.
Retry-After is honored; abort signals interrupt backoff.

Configure baseURL for staging. Absolute API paths are rejected and ids are encoded
as single segments. Company secret keys remain server-side. Tickets and Data Studio
are Corporate capabilities; API access remains available on every plan.

See [the example](./examples/journey-hybrid.ts) for a typed four-moment journey with local media, conditional
webhook content and waits. It remains disabled and sends no evaluations.

React Native supports identified Woku/NPS/CSAT/CES journey responses with a
persistent scoped queue. Widget keeps Woku/NPS and accepts response context through
postMessage. Package READMEs describe retry, identity and storage constraints.

Management and Native packages ship checked ESM/CJS exports with matching
type declarations. Management types regenerate from a vendored API v1 spec;
`pnpm --filter @wokuapp/sdk check:generated` detects drift standalone.
