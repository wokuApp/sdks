# @wokuapp/sdk

## 0.3.0

### Minor Changes

- 4486b4f: Add journey v2 authoring policy, independent moment connections, webhook fallbacks,
  ticket email destinations, platform-user plan groups, and typed enrollment activity. Add methods to read and stop
  one exact participation, configure moment credentials, and preview payload mapping.
- 8bc32e9: Expose complete journey moment and response types, advanced webhook content and
  resolved preview fields. Synchronize the generated OpenAPI and document strict
  transport validation and separate legacy/per-moment credentials.
- 4adb4ec: Add media uploads and safe journey enrollment iterators, synchronize generated
  API types and repair headers, URL scoping, pagination, cancellation and retry
  policies. React Native supports CSAT/CES and identified journey tokens, with
  company-scoped persistent captures and retained failures. Widget preserves
  identified journey context and validates both sides of its iframe bridge.

  Requires the API update that claims idempotency keys before writes. Deploy that
  server revision before publishing these SDK packages. No release is published by
  this changeset. Consult each package README for replay and storage limits.

- 5d21599: Replace custom journey tool assignments with moment-owned tool specifications and per-enrollment or shared creation scope. Custom moments support woku, CSAT, CES, and NPS.

### Patch Changes

- 4ae81b1: Document the shared tool default for new v2 moments and the one-hour meaning of a zero-day delay.
- 3850b86: Allow customer journeys to enable or disable ticket and plan actions independently,
  and type the English title of moment-owned Wokus.
- dc2c3ef: Expose completed journey cycles and pending moments in enrollment responses.
- 1cc7fa7: Document the media upload size error and synchronize its generated 413 response contract.
- 3d87c65: Synchronize generated Woku media upload schemas and document the local-agent upload path. Correct the journey v2 tool-scope documentation without changing client behavior.

## 0.2.2

### Patch Changes

- ce24e1b: Docs: the Quickstart now assigns the created tracker to the NPS tool (it was created but never used), and the monorepo README lists all three packages (`@wokuapp/sdk`, `@wokuapp/react-native`, `@wokuapp/woku-widget`).

## 0.2.1

### Patch Changes

- fd01454: Remove `actionPlans.send()`. Sending action plans to external destinations (Jira, Monday, ClickUp, Notion) is not available in production, so the method only advertised destinations that do not work. Manage plans inside woku with `approve`, `complete`, `cancel`, `reopen`, `resume`, and the task methods. The production external integrations are Shopify and Zendesk.

## 0.2.0

### Minor Changes

- a66a50b: Initial release of `@wokuapp/sdk`, the official server-side SDK for the Woku
  management API. Typed client over `/v1` with automatic retries (full-jitter +
  `Retry-After`), idempotent creates, auto-pagination, a typed error hierarchy
  carrying the server `request_id`, and namespaces for trackers, VoC tools
  (NPS/CSAT/CES), wokus, forms, flows, action plans, tickets, ticket
  destinations, dispatches, reports, company and quarantines.
