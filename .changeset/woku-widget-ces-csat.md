---
'@wokuapp/woku-widget': minor
---

Capture CES and CSAT (`captureType: 'ces' | 'csat'`, with `cesToolId` / `csatToolId`) on a 1-5
scale that shows the tool's own question in the widget language. NPS shows the tool's subject
and audience when `npsToolId` is set. The score of NPS, CES and CSAT is kept when the person
sends without a comment (previously skipping the NPS comment discarded the score). New
`startOpen` option opens a side-tab or banner as soon as its trigger fires. The iframe now
delegates the microphone (`allow="microphone"`) so voice notes work on hosts that allow it.

Fixes: the thank-you step stays visible for 2.5 s after a submit (it used to be hidden at
once); the `open` event also fires when the panel opens by itself (modal, fullscreen or
`startOpen`); a person invited by email or dispatch token is no longer offered "Rate again".

Also fixes the styling of the widget itself: the build never ran Tailwind, so the CSS shipped
to the CDN (0.3.1) had no utility classes and the widget rendered unstyled; a side-tab opened
by click or `startOpen` stayed squeezed into its 60 px collapsed width; and the close button,
drawn outside the panel, was clipped by the iframe. The panel now follows the height of
its content, with room for the rating hint ("Select from 1 to 5") so the iframe no longer
cuts it. Escape now closes an open panel.

The woku mode now reads the API's reviewer payload (`{ woku, users, company }`): the woku
name and image were missing because the widget expected a flat object. The name uses the
widget language when the woku has that translation.
