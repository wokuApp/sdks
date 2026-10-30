---
'@wokuapp/sdk': minor
---

Support and plans by folder: ticket destinations and action plan groups accept `scopeKind: 'folder'` with a `folderId`; `ticketDestinations.list`, `actionPlanGroups.list`, `tickets.list` and `tickets.stats` filter by `folderId`; tickets expose `origin.folder`, `origin.trackers[].label` (the journey name behind a journey id) and `destinationIds` (every destination the ticket reached; `destinationId` is the primary one); `folders.delete(id, { confirmDependents: true })` confirms deleting the destinations and groups configured on the folder (otherwise the API answers 409 `FOLDER_HAS_DEPENDENTS`).
