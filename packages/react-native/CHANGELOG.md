# @wokuapp/react-native

## 0.2.0

- Reject malformed persisted queue rows without losing their stored contents.

### Minor Changes

- 4adb4ec: Add media uploads and safe journey enrollment iterators, synchronize generated
  API types and repair headers, URL scoping, pagination, cancellation and retry
  policies. React Native supports CSAT/CES and identified journey tokens, with
  company-scoped persistent captures and retained failures. Widget preserves
  identified journey context and validates both sides of its iframe bridge.

  Requires the API update that claims idempotency keys before writes. Deploy that
  server revision before publishing these SDK packages. No release is published by
  this changeset. Consult each package README for replay and storage limits.

### Patch Changes

- ddc40f5: Preserve confirmed capture results when local acknowledgement fails, stop sending
  cleared queue snapshots, bound response-body reading and normalize nested API
  errors. Reset Widget evaluation identity when changing prepared customer context
  and ignore initialization callbacks after destroying their original instance.

## 0.1.0

### Minor Changes

- Initial release. Headless TypeScript core for capturing Woku ratings (1–5)
  and NPS (0–10) with optional text/audio comments:
  - `WokuSdk` orchestrator with immediate send + durable offline queue.
  - Quarantine-aware delivery (HTTP 429 back-off) and automatic retry.
  - Injectable adapters (Storage, HttpClient, Logger) so the core is
    platform-agnostic and unit-tested.
  - Fully typed public API and error classes.
