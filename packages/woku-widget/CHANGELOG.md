# @wokuapp/woku-widget

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
