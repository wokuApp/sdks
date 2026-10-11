# @wokuapp/woku-widget

## 0.3.0

### Minor Changes

- 7f50ee3: Add authorized read-only follow-up conversations and typed ticket evidence
  metadata to the management SDK. Preserve explicit standalone/Flow capture
  provenance in mobile and widget submissions, and keep historical offline
  payloads and IDs unchanged during replay.

  Add explicit typed custom HTTP destination update contracts, retaining receiver
  event/case identity and original remote references.

## 0.2.0

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
