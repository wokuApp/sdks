---
'@wokuapp/sdk': minor
---

Add `folders` (list, get, create, update, move, delete, report, csv) and `tools`
(cursor-paginated list across wokus, NPS, CSAT and CES with search and filters,
headline stats per type, batch move) resources. NPS, CSAT and CES tools accept
`folderId` on create, expose it on every tool and gain `move(id, { folderId })`.
Regenerated types from the public OpenAPI.
