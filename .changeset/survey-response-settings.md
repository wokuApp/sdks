---
'@wokuapp/sdk': minor
---

NPS, CSAT and CES tools take `anonymousDisabled` and `onlyOneResponsePerClient` on create and update, and return both on every tool. A repeat answer to a one-response-per-client survey is rejected with HTTP 409 `ALREADY_RESPONDED`.
