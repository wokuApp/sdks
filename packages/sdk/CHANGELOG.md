# @wokuapp/sdk

## 0.8.0

### Minor Changes

- 8c40edd: `reportSubscriptions` schedules report emails (monthly, every two weeks, weekly or once) for a folder or a tool. `folderParticipants` keeps a folder's participant list, says who of it answered each tool and resends to the missing. `folders.csv` takes a period and `tools.list` sorts by the latest response (`lastResponse`).
- c1afb7c: NPS, CSAT and CES tools take `anonymousDisabled` and `onlyOneResponsePerClient` on create and update, and return both on every tool. A repeat answer to a one-response-per-client survey is rejected with HTTP 409 `ALREADY_RESPONDED`.

## 0.7.0

### Minor Changes

- c035cc2: `whatsappAlertRecipients` numbers take `allReviews`: `true` alerts every review
  (recognitions too), `false` or absent keeps improvement alerts only. Folders
  return it on every recipient.

## 0.6.0

### Minor Changes

- baa11c8: `folders.metrics` accepts a custom `from`/`to` range of UTC days (`YYYY-MM-DD`,
  both inclusive, up to 731 days), as the admin custom period, and its result
  carries `from` and `to` when one was asked for.
- 52b0ba4: Remove `quarantines.check()` from the management SDK: the public API no longer
  exposes `GET /v1/quarantines/check` (quarantines are not managed from the admin
  anymore). Existing quarantines are still enforced when a respondent answers.
  The widget loader stops calling that endpoint before registering its triggers.

## 0.5.0

### Minor Changes

- d59eabd: Add `folders` (list, get, create, update, move, delete, report, csv) and `tools`
  (cursor-paginated list across wokus, NPS, CSAT and CES with search and filters,
  headline stats per type, batch move) resources. NPS, CSAT and CES tools accept
  `folderId` on create, expose it on every tool and gain `move(id, { folderId })`.
  Regenerated types from the public OpenAPI.
  Add `journeyFolders` (`status`, `organize`), `folderId` and `momentFolders` on journeys, and `origin` on folders.
  Folders expose `whatsappAlertRecipients` (settable on `folders.update`): the WhatsApp numbers alerted when a comment on any wokus, NPS, CSAT or CES tool of the folder is an improvement, with `sources` per number.
  Flows are no longer read-only: `flows.create`, `update` and `delete`, and `steps` (woku, NPS, CSAT and CES) on every flow.
  Add `folders.pdf` (the folder report as PDF bytes) and folder paging on `tools.list` (`foldersLimit`, `foldersNextCursor`, `page.hasMoreFolders()` and `page.getMoreFolders()`).
  Add `folders.metrics` (per-tool figures for a period against the one before it, daily sums and the histogram of scores), `trackers` on `tools.list` and `integrationProvider` on folders.

## 0.4.0

### Minor Changes

- 7f50ee3: Add authorized read-only follow-up conversations and typed ticket evidence
  metadata to the management SDK. Preserve explicit standalone/Flow capture
  provenance in mobile and widget submissions, and keep historical offline
  payloads and IDs unchanged during replay.

  Add explicit typed custom HTTP destination update contracts, retaining receiver
  event/case identity and original remote references.

- fecc584: Type the follow-up WhatsApp `line`, each message's `phase` (survey prelude or
  follow-up), the files the customer sent (`attachments`, with `adminUrl`) and
  the files the summary cites (`summaryCitations`) on `followUps.get`.

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
