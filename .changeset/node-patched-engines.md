---
'@wokuapp/sdk': minor
'@wokuapp/react-native': minor
---

`engines.node` now accepts only Node.js lines with the October 2026 security fixes: Node 22 (22.23.4 or later) or Node 24.22.1 or later. Node 18 and 20 are end of life and no longer supported. npm only warns on an unsupported version unless `engine-strict` is set. No API change.
