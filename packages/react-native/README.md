<div align="center">

# @wokuapp/react-native

Capture **Woku, NPS, CSAT and CES** from your React Native
app, with offline buffering and quarantine-aware delivery.

[![npm](https://img.shields.io/npm/v/@wokuapp/react-native)](https://www.npmjs.com/package/@wokuapp/react-native)
[![license](https://img.shields.io/npm/l/@wokuapp/react-native)](../../LICENSE)
[![types](https://img.shields.io/npm/types/@wokuapp/react-native)](https://www.npmjs.com/package/@wokuapp/react-native)

</div>

## Why

Drop Woku feedback capture into an existing iOS/Android app without building
your own ingestion, retry, or offline logic. The SDK:

- Captures **Woku ratings** (1–5) and **NPS** (0–10) with optional text or
  audio comments.
- **Buffers offline** through your storage adapter. Call `flush()` when
  connectivity returns; the headless core has no connectivity listener.
- Is **quarantine-aware**: when the backend rate-limits a respondent (HTTP
  429), the SDK backs off instead of hammering it.
- Has **zero runtime dependencies** and a **fully typed**, framework-agnostic
  core: you inject the platform adapters (storage, http, audio), so it stays
  small and testable.

> **Architecture note.** This release ships the headless TypeScript
> core plus the adapter interfaces. Pre-built React Native adapters
> (MMKV storage, audio recorder) ship in a follow-up minor; until then you
> wire your app's libraries to the small interfaces below (a few lines).
> Captures post to the resource-oriented `/v1/captures` endpoint and are
> tagged server-side with the `mobile-sdk` response channel. Text/rating and
> score captures are sent as JSON; **audio captures are sent as multipart**
> (the `audio.uri` file plus a `payload` field) and become a voicemail review
> server-side. Submissions deduplicate by their client-generated `id` for 24h.
> Older uncertain submissions are retained for inspection instead of replayed.

## Install

```bash
npm install @wokuapp/react-native
# or
pnpm add @wokuapp/react-native
```

`react` and `react-native` are optional peers (only needed once the native
adapters land).

## Quickstart

```ts
import { WokuSdk } from '@wokuapp/react-native';

const woku = new WokuSdk({
  apiUrl: 'https://clientapi.woku.app',
  publicKey: 'pk_live_xxx', // per-company SDK key
  companyId: 'company_123',
  storage: mmkvStorageAdapter, // see "Adapters" below
});

// NPS capture (0–10)
await woku.captureNps({
  npsId: 'nps_q2_2026',
  score: 9,
  comment: 'Fast checkout, loved it.',
});

// Woku rating (1–5) with a text comment
await woku.captureWoku({
  wokuId: 'woku_store_centro',
  rating: 5,
  comment: 'Great staff, quick service.',
  respondent: { email: 'ana@example.com' },
});

// Flush queued captures (e.g. on app foreground / reconnect)
const { sent, remaining } = await woku.flush();
```

Every capture resolves to a `SubmissionResult` with a `status` of
`sent` | `queued` | `quarantined` | `failed` — it never throws on network
loss; the submission is queued and retried.

## Adapters

The core depends on three small interfaces. Wire them to your app's libraries.

### Storage (required for offline buffering)

```ts
import { MMKV } from 'react-native-mmkv';
import type { Storage } from '@wokuapp/react-native';

const mmkv = new MMKV();
export const mmkvStorageAdapter: Storage = {
  getItem: (k) => mmkv.getString(k) ?? null,
  setItem: (k, v) => mmkv.set(k, v),
  removeItem: (k) => mmkv.delete(k),
};
```

Don't pass `storage` and the SDK falls back to in-memory (lost on restart).

### HTTP (optional)

Defaults to the global `fetch`. Override to add tracing, custom TLS, etc.:

```ts
import type { HttpClient } from '@wokuapp/react-native';
const http: HttpClient = { request: async (req) => /* ... */ };
```

## Offline & retry semantics

`flush()` walks the queue oldest-first:

| Outcome            | Behavior                                                                               |
| ------------------ | -------------------------------------------------------------------------------------- |
| `sent`             | removed from the queue                                                                 |
| quarantine (429)   | **stops** the flush, keeps everything for the next attempt                             |
| network error      | attempt count bumped, item kept, flush continues                                       |
| `failed` (4xx/5xx) | permanent 4xx retained as failed; transient errors retained after the 8-attempt budget |

The queue persists through your `Storage` adapter, so it survives restarts.

## API

| Member                | Description                                         |
| --------------------- | --------------------------------------------------- |
| `new WokuSdk(config)` | Create an SDK instance.                             |
| `captureWoku(input)`  | Submit a 1–5 rating (+ comment/audio).              |
| `captureCsat(input)`  | Submit a 1–5 satisfaction score.                    |
| `captureCes(input)`   | Submit a 1–5 effort score.                          |
| `failedCaptures()`    | Inspect retained failures and their reason.         |
| `captureNps(input)`   | Submit a 0–10 NPS score (+ review).                 |
| `flush()`             | Retry all queued captures. Returns a `FlushResult`. |
| `pendingCount()`      | Number of captures waiting to send.                 |
| `clearQueue()`        | Remove only this company's pending and failed rows. |

Lower-level building blocks `WokuClient` and `OfflineQueue` are exported too,
along with all types and error classes (`WokuValidationError`,
`WokuQuarantineError`, `WokuNetworkError`, …).

## License

[MIT](../../LICENSE) © Woku

## Identified journey responses

```ts
await sdk.captureCsat({
  csatId: prepared.toolId,
  score: 5,
  respondent: { email: customer.email },
  dispatchToken: prepared.token,
});
await sdk.captureCes({
  cesId: effortToolId,
  score: 4,
  respondent: { phone: customer.phone },
});
```

Use only a public pk\_ key: the transport uses x-woku-key and rejects management
keys. remoteId is the server id. Woku/NPS audio supports language es/en (default
Spanish); CSAT/CES audio is not supported. timeoutMs bounds an attempt (default
30s), including injected adapters.

Await capture calls and provide persistent storage. Captures are stored before
delivery. Call flush on reconnect/foreground; the core has no connectivity listener.
Company-scoped instances never send or clear another company's rows. Concurrent
enqueue/flush preserves incoming data. Share one storage adapter per app and one
SDK per company; isolate storage between API environments.

Inspect failedCaptures for permanent failures, exhausted attempts and captures
older than the server's 24-hour replay window (based on the device clock). These records are retained and are
not blindly sent with a new id: inspect delivery before resubmitting. clearQueue
removes only the current company's pending and retained failed rows.

The published package includes separate ESM/CJS JavaScript and matching
`.d.ts`/`.d.cts` exports. Both imports are checked against the packed artifact.

### Delivery failures and clearing

`timeoutMs` covers receiving the response and reading its body. Validation
messages use the API's nested error envelope and remain strings. If the server
confirms a capture but local acknowledgement cannot be stored, the capture call
still returns `sent`; the pending row retains its original ID for a safe later
flush. A storage failure before enqueue prevents the network request.

`clearQueue()` removes this company's rows and prevents an active flush from
starting further sends from its old snapshot. An already started request may
finish and cannot be recalled.
