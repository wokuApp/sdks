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

Each moment creates its own CSAT, CES, NPS, or woku tool. `toolScope` is
`'per_enrollment'` or `'shared'` within that moment and configuration. Existing
tools cannot be assigned. Use `toolSpec` for question variables, or an uploaded
`fileId` for Woku. The example uses one initial send and no reminders.
For a bilingual Woku, set `toolSpec.descriptionEn` to its English title.

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
