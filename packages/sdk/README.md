<div align="center">

# @wokuapp/sdk

Official **server-side** SDK for the [Woku](https://woku.app) management API.

[![npm](https://img.shields.io/npm/v/@wokuapp/sdk)](https://www.npmjs.com/package/@wokuapp/sdk)
[![license](https://img.shields.io/npm/l/@wokuapp/sdk)](../../LICENSE)
[![types](https://img.shields.io/npm/types/@wokuapp/sdk)](https://www.npmjs.com/package/@wokuapp/sdk)

</div>

## Why

Manage supported woku resources from your backend with one typed client:
trackers, VoC tools (NPS/CSAT/CES), wokus, forms, flows, action plans,
support tickets, delivery tracking and survey sends over the public `/v1` API.

- **Typed** request bodies (generated from the OpenAPI spec) and response models.
- **Automatic retries** with full-jitter backoff and `Retry-After` support.
- **Protected writes**: tracker/VoC definitions, invitations and five journey operations use
  a stable idempotency key for retries. Other writes and uploads are
  attempted once, even when a caller provides a key. See the retry policy below.
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

// Create an NPS tool.
const tool = await woku.npsTools.create({
  name: 'Post-purchase',
  npsMessage: 'How likely are you to recommend us?',
});

// Tag the NPS tool with the tracker, so every response is grouped by store.
await woku.trackers.assignToEntity('nps', tool._id, {
  name: tracker.name,
  value: 'TX-42',
});

// Send it, then read delivery + response rate.
await woku.nps.sendInvitations({
  channel: 'email',
  npsToolId: tool._id,
  recipients: ['ana@example.com'],
});

const stats = await woku.dispatches.stats({ channel: 'email' });
console.log(stats.responseRate);
```

The key is read from `WOKU_API_KEY` when you omit `apiKey`. You can also pass
it directly: `new Woku('sk_live_...')`.

### Customer journeys

Use `authoringVersion: 2` for the business-form execution contract. Choose
`startMode: 'operator'`, `'response'`, or `'webhook'` for the first moment.
Only operator mode uses `enroll`. Response mode starts when the customer answers
the first tool through a shared link or QR, not when the link is opened.
Later moments use a delay or their own webhook. A webhook advances a timed moment
and cancels its wait. A webhook-primary moment can have a secondary fallback that
evaluates that same moment once.

Each moment creates its own CSAT, CES, NPS, or woku tool. `toolScope` defaults
to `'shared'` for new v2 moments, reusing the tool within that moment and
configuration. Use `'per_enrollment'` for one tool per participation. Later
moments receive a suggested 10-day wait in the authoring form; API callers must
specify the delay. In v2, `delayMs: 0` means one hour. Existing
tools cannot be assigned. Use `toolSpec` for question variables, or an uploaded
`fileId` for Woku. The example uses one initial send and no reminders.
For a bilingual Woku, set `toolSpec.descriptionEn` to its English title.

Agents with a local terminal can upload an image or MP4 to
`POST /v1/woku-media` using multipart and the company key. The response's
`fileId` can be used as `toolSpec.fileId` in a journey Woku moment or with the
MCP `create_woku` tool. The generated `Schemas` map includes the media upload
response type; media.upload wraps the binary upload endpoint.
The endpoint returns `400` for invalid media and `413` for multipart requests
over 25 MB.

```ts
const day = 86_400_000;
const sequence = {
  attemptOffsetsMs: [0],
  deadlineMs: 3 * day,
  cooldownAfterResponseMs: 0,
};
const journey = await woku.journeys.create({
  name: 'Purchase and delivery',
  authoringVersion: 2,
  startMode: 'webhook',
  recipients: {
    ticketsEnabled: true,
    plansEnabled: true,
    ticketEmails: ['support@example.com'],
    planMembers: [
      { userId: '507f1f77bcf86cd799439011', role: 'admin' },
      { userId: '507f1f77bcf86cd799439012', role: 'assignee' },
    ],
  },
  moments: [
    {
      key: 'sale',
      name: 'Purchase',
      tool: 'csat',
      enabled: true,
      channel: 'email',
      trigger: { type: 'webhook' },
      webhook: { verification: { mode: 'url_token' } },
      toolSpec: { subject: { es: 'tu compra', en: 'your purchase' } },
      sequence,
    },
    {
      key: 'delivery',
      name: 'Delivery',
      tool: 'ces',
      enabled: true,
      channel: 'email',
      trigger: { type: 'webhook' },
      webhook: { verification: { mode: 'url_token' } },
      fallbackFromStage: 'sale',
      fallbackAfterMs: 5 * day,
      toolSpec: {
        subject: { es: 'recibir tu pedido', en: 'receiving your order' },
      },
      sequence,
    },
  ],
});

// Generate once and securely store each URL in its sending system.
// Calling mintMomentUrl again replaces the previous credential.
const sale = await woku.journeys.mintMomentUrl(journey.id, 'sale');
const delivery = await woku.journeys.mintMomentUrl(journey.id, 'delivery');
await woku.journeys.update(journey.id, { enabled: true });

// CRM and logistics use different URLs but the same purchase reference.
await fetch(sale.url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Woku-Event-Id': 'crm-order-123',
  },
  body: JSON.stringify({
    subjectKey: 'order-123',
    contact: { email: 'customer@example.com' },
  }),
});
await fetch(delivery.url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Woku-Event-Id': 'delivery-order-123',
  },
  body: JSON.stringify({ subjectKey: 'order-123' }),
});

const page = await woku.journeys.listEnrollments(journey.id, { limit: 20 });
const evaluation = page.items.find(
  (item) =>
    item.subjectKey === 'order-123' &&
    (item.lifecycle === 'pending' || item.lifecycle === 'running'),
);
if (evaluation) {
  await woku.journeys.stopEnrollment(
    journey.id,
    evaluation.id,
    {
      reason: 'Customer requested no further evaluations',
    },
    { idempotencyKey: `stop-${evaluation.id}` },
  );
}
```

`getEnrollment` reads one case. `connections` reports credential readiness;
`previewMoment` checks a sample against the saved payload mapping without sending.
`setSenderSecret` configures senders that sign with their own secret.
Enrollment lists use `{ items, nextCursor }`, not `Page`: pass `nextCursor` as the
next call's `cursor`. Stop is durable and specific to the selected participation;
answers, tickets, plans, shared tools and other cases remain. A send already
accepted by its provider may still arrive. `stopping` means cleanup is in progress;
`dispatchOutcomeUncertain` identifies an interrupted in-flight send.

`pendingMoments` names the moments that have not yet sent an invitation. A v2
participation completes when the customer answers its final tool or 30 days
after that tool's first send. The same `subjectKey` can be enrolled again once
the previous participation is completed or stopped; each cycle has its own `id`.

Tickets go to email destinations. Plans go to an action-plan group made of existing
company users; `planMembers` controls its admins and assignees. Definitions remain
off until activated and required resources are ready.
Set `recipients.ticketsEnabled` or `recipients.plansEnabled` to `false` to stop that
journey action independently. Both default to enabled when omitted. Disabled
actions do not require completed recipients; their current settings remain
available if re-enabled later.
Existing definitions retain their contract; create a new v2 journey to adopt these
rules. Current participations retain their original definition version.

## Pagination

Paginated resource methods return a `Page` (journey enrollments use the cursor envelope described above). Iterate every item across pages, or walk pages:

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
`ticketDestinations`, `dispatches`, `reports`, `company`, `quarantines`,
`journeys`.

## License

MIT

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

See [the example](../../examples/journey-hybrid.ts) for a typed four-moment journey with local media, conditional
webhook content and waits. It remains disabled and sends no evaluations.

Generate API types with `pnpm generate`; `pnpm check:generated` checks drift
against the vendored OpenAPI without requiring a sibling server checkout.
