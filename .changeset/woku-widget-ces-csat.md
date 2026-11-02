---
'@wokuapp/woku-widget': minor
---

Capture CES and CSAT (`captureType: 'ces' | 'csat'`, with `cesToolId` / `csatToolId`) on a 1-5
scale that shows the tool's own question in the widget language. NPS shows the tool's subject
and audience when `npsToolId` is set. The score of NPS, CES and CSAT is kept when the person
sends without a comment (previously skipping the NPS comment discarded the score). New
`startOpen` option opens a side-tab or banner as soon as its trigger fires. The iframe now
delegates the microphone (`allow="microphone"`) so voice notes work on hosts that allow it.
