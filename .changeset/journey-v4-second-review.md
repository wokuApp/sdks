---
'@wokuapp/react-native': patch
'@wokuapp/woku-widget': patch
---

Preserve confirmed capture results when local acknowledgement fails, stop sending
cleared queue snapshots, bound response-body reading and normalize nested API
errors. Reset Widget evaluation identity when changing prepared customer context
and ignore initialization callbacks after destroying their original instance.
