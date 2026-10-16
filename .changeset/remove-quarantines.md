---
'@wokuapp/sdk': minor
'@wokuapp/woku-widget': patch
---

Remove `quarantines.check()` from the management SDK: the public API no longer
exposes `GET /v1/quarantines/check` (quarantines are not managed from the admin
anymore). Existing quarantines are still enforced when a respondent answers.
The widget loader stops calling that endpoint before registering its triggers.
