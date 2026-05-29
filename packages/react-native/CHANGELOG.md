# @wokuapp/react-native

## 0.1.0

### Minor Changes

- Initial release. Headless TypeScript core for capturing Woku ratings (1–5)
  and NPS (0–10) with optional text/audio comments:
  - `WokuSdk` orchestrator with immediate send + durable offline queue.
  - Quarantine-aware delivery (HTTP 429 back-off) and automatic retry.
  - Injectable adapters (Storage, HttpClient, Logger) so the core is
    platform-agnostic and unit-tested.
  - Fully typed public API and error classes.
