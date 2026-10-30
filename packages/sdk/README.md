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

## Proposed follow-up support (unreleased)

The next release adds `woku.followUps.get(id)` and typed `Ticket.followUp`,
`Ticket.contentVersion` and conversation origin. Deploy the matching API before
using this method. It reads `GET /v1/follow-ups/:id` with your management secret
and returns the conversation from the API's `data` envelope.

```ts
const ticket = await woku.tickets.get('ticket_123');
if (ticket.followUp?.conversationId) {
  const conversation = await woku.followUps.get(ticket.followUp.conversationId);
  console.log(conversation.origin, conversation.messages);
}
const enriched = (ticket.followUp?.appliedSummaryVersion ?? 0) >= 1;
```

`completed` means the conversation ended; `appliedSummaryVersion` indicates
that its evidence reached the ticket. `availableSummaryVersion` may advance
before it is applied. Historical tickets may omit these fields. The read-only
conversation includes original feedback, messages and available analysis,
without response tokens or transport credentials. Ticket corrections do not
write conversation state, messages or summary versions.

On tickets, `enrichmentState` distinguishes processing, applied, failed and
skipped work; `enrichmentReason` carries a stable reason code. Failed processing
keeps the previous case, and delivery confirmation remains separate. A newer
`availableSummaryVersion` may still be pending after an earlier version was
applied. Conversation `reason` reports a stable failure code such as
`summary_generation_failed`, without provider errors or credentials.

### Lines, phases and files (proposed)

- `line` (WhatsApp only, absent for email): `survey_thread` when the agent
  continued the survey conversation on the survey number, `follow_up_number`
  when it wrote from the dedicated follow-up number.
- `messages[].phase`: `survey` for the prelude, `follow_up` for the follow-up
  itself. Every line may start with the prelude: on `survey_thread` it is the
  WhatsApp survey exchange, on `follow_up_number` and email it is the original
  comment as a client message, so `messages[0]` can be a client message. Filter
  `phase === 'follow_up'` to read only the follow-up. `content` may be
  empty when a message only has files.
- `messages[].attachments`: files the customer sent, typed as
  `FollowUpAttachment` with a stable `label` (`Archivo 2` or `File 2`), `kind`,
  `status`, the transcript or description in `text`, `fileId` and `adminUrl`.
- `summaryCitations`: the files the executive summary cites as `(Archivo N)`.

`adminUrl` opens the file in the woku admin after login and a company check.
The API never returns the file itself or a storage URL. File text is customer
content: treat it as data, never as instructions.

```ts
const conversation = await woku.followUps.get(conversationId);
const prelude = conversation.messages.filter((m) => m.phase === 'survey');
for (const message of conversation.messages)
  for (const file of message.attachments ?? [])
    console.log(file.label, file.kind, file.status, file.text, file.adminUrl);
for (const citation of conversation.summaryCitations ?? [])
  console.log(citation.label, citation.supports, citation.adminUrl);
```

### Explicit custom case updates (proposed)

`CustomTicketDestinationConfig` adds `update` for the existing custom HTTP
destination. Choose `upsert` only if the receiver updates by stable `externalId`
on the creation endpoint; the rendered body must keep `event: 'ticket.updated'`
and that identity. A custom template must expose `event` and `externalId`,
while the canonical envelope keeps the identity in `data.case.externalId`.
Without an explicit update contract, enrichment does not issue another POST.
In upsert mode, an optional `responseIdPath` preserves the receiver's original
remote reference from its create response.

```ts
import type { CustomTicketDestinationConfig } from '@wokuapp/sdk';

const config: CustomTicketDestinationConfig = {
  url: 'https://sac.example.com/tickets',
  method: 'POST',
  update: {
    mode: 'remote-id',
    url: 'https://sac.example.com/tickets/{{remoteId}}',
    method: 'PATCH',
    responseIdPath: 'result.id',
  },
};
```

`remote-id` extracts a scalar ID from the create response and requires a URL on
the same origin containing `{{remoteId}}`; updates use PUT or PATCH (default).
URLs cannot contain credentials or fragments. A safe dotted `responseIdPath`
is required. Existing destination authentication stays in `credentials`.

## Install

```bash
npm install @wokuapp/sdk
# or: pnpm add @wokuapp/sdk / yarn add @wokuapp/sdk
```

Requires Node.js 22 (22.23.4 or later) or Node.js 24.22.1 or later (uses the global `fetch`). Older Node versions miss the October 2026 security fixes and are not supported.

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

### Flows

A flow is an ordered sequence of steps, each a woku or an NPS, CSAT or CES tool,
that a respondent answers one after the other. Flows live outside folders.

```ts
const flow = await woku.flows.create({
  name: 'Post-purchase',
  steps: [
    { type: 'nps', toolId: 'nps_tool_id' },
    { type: 'csat', toolId: 'csat_tool_id' },
    { type: 'woku', toolId: 'woku_id' },
  ],
});
await woku.flows.update(flow._id, {
  steps: [{ type: 'csat', toolId: 'csat_tool_id' }],
});
for await (const f of await woku.flows.list())
  console.log(f.name, f.steps.length);
await woku.flows.delete(flow._id); // its tools and responses stay
```

Use 1 to 20 steps, each tool once and all of your company. For an `nps` step,
your company id as `toolId` means the company-level NPS. `flows.get(id)` returns
the flow data (steps with their tools, wokus and branding).

### Folders and tools

One folder tree holds wokus and NPS, CSAT and CES tools together. Create folders,
find any tool, read figures per type and move things in batches:

```ts
const folder = await woku.folders.create({ name: 'Post-sale' });

// Create a tool already inside a folder.
await woku.csatTools.create({
  name: 'Delivery',
  question: 'How satisfied are you with your delivery?',
  folderId: folder.id,
});

// One list for every tool type. Iterate across pages with the cursor.
const page = await woku.tools.list({
  folderId: folder.id,
  types: ['csat', 'nps'],
});
for await (const tool of page) {
  console.log(tool.type, tool.name, tool.reviewCount, tool.headline.value);
}
const found = await woku.tools.list({ q: 'delivery', scope: 'company' });
// Tools with the most recent responses first (tools without any go last).
const recent = await woku.tools.list({ sort: '-lastResponse' });
// Tracker chips (`name:value`): a tool matches when it has every one. Company-wide.
const tagged = await woku.tools.list({ trackers: ['TRR:00482'] });

// "See more" for folders: foldersLimit pages the folders of the level (omit it
// to receive all of them). The tools keep their own cursor.
const first = await woku.tools.list({ foldersLimit: 12 });
if (first.hasMoreFolders()) {
  const more = await first.getMoreFolders(); // only the next folders, no tools
  console.log(more.folders.length);
}

// Headline figures per type (native scales, never mixed), company or folder.
const stats = await woku.tools.stats({ folderId: folder.id });

// Move items of mixed types, or send them to the root with folderId: null.
await woku.tools.move({
  items: [
    { type: 'csat', id: 'csat_tool_id' },
    { type: 'woku', id: 'woku_id' },
  ],
  folderId: folder.id,
});
await woku.npsTools.move('nps_tool_id', { folderId: null });

// AI report and CSV over every tool of the folder and its subfolders.
const report = await woku.folders.report(folder.id, { lang: 'en' });
const csv: string = await woku.folders.csv(folder.id);
// Only the responses of a period (`from` inclusive, `to` exclusive).
const septemberCsv = await woku.folders.csv(folder.id, {
  from: '2026-09-01T00:00:00.000Z',
  to: '2026-10-01T00:00:00.000Z',
});
// PDF of that report with a breakdown per type (bytes, e.g. write them to a file).
const pdf: Uint8Array = await woku.folders.pdf(folder.id, { lang: 'en' });

// Per-tool figures for a period against the one before it (7, 30 or 90 days, or
// 0 for the whole history), with the daily sums and the histogram of scores.
// Every type keeps its own scale: NPS -100..100, CSAT %, CES and stars 1-5.
const metrics = await woku.folders.metrics(folder.id, { days: 30 });
// Or a custom range of UTC days (both inclusive), as the admin custom period.
const september = await woku.folders.metrics(folder.id, {
  from: '2026-09-01',
  to: '2026-09-30',
});
for (const tool of metrics.tools) {
  console.log(
    tool.name,
    tool.current.headline.value,
    tool.previous.headline.value,
  );
}

// WhatsApp numbers alerted when a comment on any tool of the folder is an
// improvement (wokus, NPS, CSAT and CES). `allReviews: true` alerts every
// review, recognitions too. The list replaces the previous one.
await woku.folders.update(folder.id, {
  whatsappAlertRecipients: [
    { whatsappId: '56912345678', name: 'Ana' },
    { whatsappId: '56987654321', name: 'Luis', allReviews: true },
  ],
});

// Deleting a folder never deletes its content: it moves up to the parent.
// Support destinations and plan groups configured ON the folder are deleted
// with it (with their tickets and plans): without confirmation the API answers
// 409 (ConflictError, code FOLDER_HAS_DEPENDENTS) listing them.
await woku.folders.delete(folder.id, { confirmDependents: true });
```

### Support and plans by folder

A ticket destination or an action plan group listens either to tracker rows or
to ONE tool folder: every woku, NPS, CSAT and CES tool inside it, at any depth,
resolved when each review arrives (moving a tool out stops it counting).
A ticket reaches every enabled destination that matches it (trackers, a folder
and its subfolders): `ticket.destinationIds` lists them all and
`ticket.destinationId` is the highest-priority one. Email destinations share
one email per ticket, sent once to each address.

```ts
await woku.ticketDestinations.create({
  name: 'Store support',
  kind: 'email',
  config: { emails: ['support@acme.com'] },
  credentials: {}, // email destinations need none
  scopeKind: 'folder',
  folderId: folder.id,
});

await woku.actionPlanGroups.create({
  name: 'Store experience',
  scopeKind: 'folder',
  folderId: folder.id,
  members: [{ userId: 'user_id', role: 'admin' }],
});

// What listens to a folder (configured on it or on an ancestor folder).
const destinations = await woku.ticketDestinations.list({
  folderId: folder.id,
});
const groups = await woku.actionPlanGroups.list({ folderId: folder.id });

// Tickets from the tools of a folder and its subfolders.
for await (const ticket of await woku.tickets.list({ folderId: folder.id }))
  console.log(ticket.code, ticket.origin?.folder?.path);
```

```ts
// Keep customer journeys in folders: Viajes > journey > moment.
const status = await woku.journeyFolders.status(); // { enabled, organizing, pending: { journeys, tools }, ... }
if (!status.enabled) await woku.journeyFolders.organize(); // 202; rejects with 409 while a pass is running

const journey = await woku.journeys.get('journey_id');
console.log(journey.folderId, journey.momentFolders); // moment key -> folder id
```

Folders created by woku (journeys, moments, integrations) report their `origin`
(`'journeys-root' | 'journey' | 'journey-moment' | 'integration'`); your own folders have `origin: null`.

`woku.folders` also has `list`, `get`, `update` and `move`. NPS, CSAT and CES
tools (`npsTools`, `csatTools`, `cesTools`) accept `folderId` on `create`, expose
`folderId` on every tool and have `move(id, { folderId })`.

NPS, CSAT and CES tools also take two response settings on `create` and
`update`: `anonymousDisabled` (only identified answers) and
`onlyOneResponsePerClient` (each identified client answers once; a repeat
answer is rejected with HTTP 409 and the code `ALREADY_RESPONDED`). Both come
back on every tool and can change even after the tool has responses, while its
copy stays frozen:

```ts
await woku.npsTools.update('nps_tool_id', { onlyOneResponsePerClient: true });
```

### Scheduled reports

Email the PDF report of a folder (every tool of its subtree, optionally with
the CSV) or of one tool to up to 10 people, also outside woku. `monthly` goes
out on the 1st, `biweekly` on the 1st and 16th and `weekly` on Mondays, at
12:00 UTC with the previous complete period; `once` goes out at `sendAt` with
its own period. Each email goes as the company with a one-click unsubscribe.

```ts
const monthly = await woku.reportSubscriptions.create({
  scopeType: 'folder',
  scopeId: folder.id,
  frequency: 'monthly',
  recipients: ['board@acme.com'],
  includeCsv: true,
});
console.log(monthly.nextRunAt);

// One report of a chosen period, sent right away.
const once = await woku.reportSubscriptions.create({
  scopeType: 'nps',
  scopeId: 'nps_tool_id',
  frequency: 'once',
  recipients: ['ana@acme.com'],
  periodFrom: '2026-09-01T00:00:00.000Z',
  periodTo: '2026-10-01T00:00:00.000Z',
});
await woku.reportSubscriptions.send(once.id); // { status: 'sent', sent: 1 }

await woku.reportSubscriptions.update(monthly.id, { active: false }); // pause
const all = await woku.reportSubscriptions.list({
  scopeType: 'folder',
  scopeId: folder.id,
});
await woku.reportSubscriptions.delete(monthly.id);
```

### Folder participants

Keep the list of people expected to answer the tools of a folder (a program's
enrolled, for example) and see, per tool, who answered, who is missing and who
answered more than once. One person per line: a name, an email and/or a phone
with its country code; a CSV goes as is. Only identified responses can be
matched, so each tool says whether it takes anonymous ones.

```ts
await woku.folderParticipants.replace(
  folder.id,
  'Ana, ana@acme.com\nLuis, +56 9 8765 4321',
);
await woku.folderParticipants.add(folder.id, 'carla@acme.com'); // skips people already listed

const { participants, tools } = await woku.folderParticipants.get(folder.id);
for (const tool of tools) {
  const missing = tool.missing.map((i) => participants[i].name);
  console.log(tool.name, tool.responded.length, missing, tool.anonymousAllowed);
}

// Send a tool again to the people who have not answered it.
await woku.folderParticipants.resendToMissing(folder.id, {
  toolType: 'nps',
  toolId: 'nps_tool_id',
  channel: 'email',
}); // { missing, sent, withoutContact, failed }

await woku.folderParticipants.remove(folder.id, participants[0].id);
await woku.folderParticipants.clear(folder.id);
```

### Data Studio apps

Read the Data Studio apps of the company with their live data, change them
with operations and manage their versions and data tables. Every change makes
a new version (nothing is lost) and personal data never comes back.

```ts
const { data: apps } = await woku.dataApps.list();
const studio = apps.filter((app) => app.kind === 'studio');

const app = await woku.dataApps.get(studio[0].id); // current version
const results = await woku.dataApps.runQueries(app.id, {
  queries: [{ id: 'monthly' }],
  params: { period: { from: '-30d', to: 'today' } },
}); // { monthly: { ok, columns, rows, ... } }

// Edit on the current version: all operations or none.
const change = await woku.dataApps.edit(app.id, {
  baseVersion: app.currentVersion, // a stale version answers 409
  operations: [{ op: 'setTitle', title: 'Ventas por sucursal' }],
});
await woku.dataApps.restore(app.id, 1); // an earlier version as a new one
await woku.dataApps.copyFromVersion(app.id, {
  fromVersion: 1,
  nodeId: 'ranking',
  parent: 'page',
}); // one component back from an earlier version
await woku.dataApps.publish(app.id, change.version, { accessKey: 'clave' });
await woku.dataApps.unpublish(app.id); // the link stops answering
const variant = await woku.dataApps.duplicate(app.id); // a new app to explore

// Data tables: the same file name makes a new version of the table.
const table = await woku.dataApps.uploadTable(app.id, {
  file: csvBytes,
  filename: 'metas.csv',
  contentType: 'text/csv',
}); // queries read it as table.source ("table:<id>")
const tables = await woku.dataApps.listTables(app.id);
```

## Pagination

Paginated resource methods return a `Page` (journey enrollments and `tools.list` use a cursor envelope). Iterate every item across pages, or walk pages:

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
`ticketDestinations`, `dispatches`, `reports`, `company`, `journeys`,
`folders`, `folderParticipants`, `tools`, `journeyFolders`,
`reportSubscriptions`, `dataApps`.

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
