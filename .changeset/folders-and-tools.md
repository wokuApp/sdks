---
'@wokuapp/sdk': minor
---

Add `folders` (list, get, create, update, move, delete, report, csv) and `tools`
(cursor-paginated list across wokus, NPS, CSAT and CES with search and filters,
headline stats per type, batch move) resources. NPS, CSAT and CES tools accept
`folderId` on create, expose it on every tool and gain `move(id, { folderId })`.
Regenerated types from the public OpenAPI.
Add `journeyFolders` (`status`, `organize`), `folderId` and `momentFolders` on journeys, and `origin` on folders.
Folders expose `whatsappAlertRecipients` (settable on `folders.update`): the WhatsApp numbers alerted when a comment on any wokus, NPS, CSAT or CES tool of the folder is an improvement, with `sources` per number.
Flows are no longer read-only: `flows.create`, `update` and `delete`, and `steps` (woku, NPS, CSAT and CES) on every flow.
Add `folders.pdf` (the folder report as PDF bytes) and folder paging on `tools.list` (`foldersLimit`, `foldersNextCursor`, `page.hasMoreFolders()` and `page.getMoreFolders()`).
