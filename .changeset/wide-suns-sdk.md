---
'@wokuapp/sdk': minor
---

Initial release of `@wokuapp/sdk`, the official server-side SDK for the Woku
management API. Typed client over `/v1` with automatic retries (full-jitter +
`Retry-After`), idempotent creates, auto-pagination, a typed error hierarchy
carrying the server `request_id`, and namespaces for trackers, VoC tools
(NPS/CSAT/CES), wokus, forms, flows, action plans, tickets, ticket
destinations, dispatches, reports, company and quarantines.
