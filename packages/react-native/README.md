<div align="center">

# @wokuapp/react-native

Capture **Woku ratings** and **NPS** (text + audio) from your React Native
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
- **Buffers offline** and retries automatically when connectivity returns —
  a tap on the subway never loses a response.
- Is **quarantine-aware**: when the backend rate-limits a respondent (HTTP
  429), the SDK backs off instead of hammering it.
- Has **zero runtime dependencies** and a **fully typed**, framework-agnostic
  core: you inject the platform adapters (storage, http, audio), so it stays
  small and testable.

> **Architecture note (v0.1).** This release ships the headless TypeScript
> core plus the adapter interfaces. Pre-built React Native adapters
> (MMKV storage, audio recorder) ship in a follow-up minor; until then you
> wire your app's libraries to the small interfaces below (a few lines).

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
  apiUrl: 'https://api.woku.app',
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

// Woku rating (1–5) with an audio comment
await woku.captureWoku({
  wokuId: 'woku_store_centro',
  rating: 5,
  audio: { uri: fileUri, mimeType: 'audio/m4a', durationMs: 4200 },
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

| Outcome            | Behavior                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| `sent`             | removed from the queue                                                                                 |
| quarantine (429)   | **stops** the flush, keeps everything for the next attempt                                             |
| network error      | attempt count bumped, item kept, flush continues                                                       |
| `failed` (4xx/5xx) | attempt count bumped; dropped after `maxQueueAttempts` (default 8) so a bad item can't wedge the queue |

The queue persists through your `Storage` adapter, so it survives restarts.

## API

| Member                | Description                                         |
| --------------------- | --------------------------------------------------- |
| `new WokuSdk(config)` | Create an SDK instance.                             |
| `captureWoku(input)`  | Submit a 1–5 rating (+ comment/audio).              |
| `captureNps(input)`   | Submit a 0–10 NPS score (+ review).                 |
| `flush()`             | Retry all queued captures. Returns a `FlushResult`. |
| `pendingCount()`      | Number of captures waiting to send.                 |
| `clearQueue()`        | Drop the queue (e.g. on logout).                    |

Lower-level building blocks `WokuClient` and `OfflineQueue` are exported too,
along with all types and error classes (`WokuValidationError`,
`WokuQuarantineError`, `WokuNetworkError`, …).

## License

[MIT](../../LICENSE) © Woku
