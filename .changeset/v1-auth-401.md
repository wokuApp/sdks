---
"@wokuapp/sdk": patch
---

Regenerate the v1 types: every keyed operation now documents the `401` the API returns for a missing or invalid key (it used to answer `403`), so a bad key surfaces as `AuthenticationError` instead of `PermissionDeniedError`.
