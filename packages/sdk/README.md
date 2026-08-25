<div align="center">

# @wokuapp/sdk

Official **server-side** SDK for the [Woku](https://woku.app) management API.

[![npm](https://img.shields.io/npm/v/@wokuapp/sdk)](https://www.npmjs.com/package/@wokuapp/sdk)
[![license](https://img.shields.io/npm/l/@wokuapp/sdk)](../../LICENSE)
[![types](https://img.shields.io/npm/types/@wokuapp/sdk)](https://www.npmjs.com/package/@wokuapp/sdk)

</div>

## Why

Manage your entire Woku account from your backend with one typed client:
trackers, VoC tools (NPS/CSAT/CES), wokus, forms, flows, action plans,
support tickets, delivery tracking and survey sends over the public `/v1` API.

- **Typed** request bodies (generated from the OpenAPI spec) and response models.
- **Automatic retries** with full-jitter backoff and `Retry-After` support.
- **Idempotent creates**: creates carry an auto-generated `Idempotency-Key`, so
  a retry after a blip never creates twice. Action calls (`send`, `test`,
  `reply`) are never silently replayed.
- **Auto-paginated** lists: `for await (const item of await woku.tickets.list())`.
- **Typed errors** with the server `request_id` for support.
- **Zero runtime dependencies.**

> **Server-only.** The secret key grants full management access, so the SDK
> refuses to run in a browser. Never ship it to a client bundle.

## Install

```bash
npm install @wokuapp/sdk
# or: pnpm add @wokuapp/sdk / yarn add @wokuapp/sdk
```

Requires Node.js 18+ (uses the global `fetch`).

## Quickstart

```ts
import { Woku } from '@wokuapp/sdk';

const woku = new Woku({ apiKey: process.env.WOKU_API_KEY });

// Create a tracker definition (idempotent).
const tracker = await woku.trackers.create({
  name: 'Store #1',
  system: 'retail',
});

// Create an NPS tool and send it.
const tool = await woku.npsTools.create({
  name: 'Post-purchase',
  npsMessage: 'How likely are you to recommend us?',
});
await woku.nps.sendInvitations({
  npsToolId: tool._id,
  recipients: [{ email: 'ana@example.com' }],
});

// Read delivery + response rate.
const stats = await woku.dispatches.stats({ channel: 'email' });
console.log(stats.responseRate);
```

The key is read from `WOKU_API_KEY` when you omit `apiKey`. You can also pass
it directly: `new Woku('sk_live_...')`.

## Pagination

List methods return a `Page`. Iterate every item across pages, or walk pages:

```ts
for await (const ticket of await woku.tickets.list({ severity: 'high' })) {
  console.log(ticket.title);
}

const first = await woku.dispatches.list({ channel: 'whatsapp' });
if (first.hasNextPage()) {
  const second = await first.getNextPage();
}
```

## Errors

Every failure is a `WokuError`. HTTP errors are typed subclasses carrying the
status, parsed body and `requestId`:

```ts
import { NotFoundError, RateLimitError } from '@wokuapp/sdk';

try {
  await woku.tickets.get('nonexistent');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.error(err.status, err.requestId); // 404, "req_..."
  } else if (err instanceof RateLimitError) {
    console.error('retry after', err.retryAfterSeconds);
  }
}
```

Transport failures (DNS/TLS/timeout/abort) are `WokuConnectionError` /
`WokuTimeoutError`.

## Configuration

```ts
new Woku({
  apiKey: process.env.WOKU_API_KEY,
  baseURL: 'https://clientapi.woku.app', // default
  timeout: 60_000, // ms, default
  maxRetries: 2, // default
});
```

Per-call overrides go in the last argument of any method:

```ts
await woku.tickets.list(
  { severity: 'high' },
  { timeout: 10_000, maxRetries: 0 },
);
await woku.npsTools.create(body, { idempotencyKey: 'my-key' });
```

## Resources

`trackers`, `npsTools` / `csatTools` / `cesTools`, `nps` / `csat` / `ces`,
`wokus`, `forms`, `flows`, `actionPlans`, `actionPlanGroups`, `tickets`,
`ticketDestinations`, `dispatches`, `reports`, `company`, `quarantines`.

## License

MIT
