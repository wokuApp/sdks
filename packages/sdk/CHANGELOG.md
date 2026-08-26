# @wokuapp/sdk

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
