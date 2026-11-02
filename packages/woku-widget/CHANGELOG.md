# @wokuapp/woku-widget

## 0.4.0

### Minor Changes

- 172c2c5: Capture CES and CSAT (`captureType: 'ces' | 'csat'`, with `cesToolId` / `csatToolId`) on a 1-5
  scale that shows the tool's own question in the widget language. NPS shows the tool's subject
  and audience when `npsToolId` is set. The score of NPS, CES and CSAT is kept when the person
  sends without a comment (previously skipping the NPS comment discarded the score). New
  `startOpen` option opens a side-tab or banner as soon as its trigger fires. The iframe now
  delegates the microphone (`allow="microphone"`) so voice notes work on hosts that allow it.

  Fixes: the thank-you step stays visible for 10 s after a submit (it used to be hidden at
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

  The widget now looks like the woku review page its respondents already know: it applies
  Montserrat (it was loaded but never used), buttons have square corners instead of pills, the
  CES and CSAT scale uses bordered boxes, hints are dark tooltips, and the comment step puts
  "Send" first with the secondary action and a round voice-note button below. Copy: "Send
  Feedback" is now "Send", and the Spanish "Saltar" is now "Omitir".

  The woku image keeps its proportions in the short frame, as on review.woku.app: a blurred
  cover fills the frame and the whole image sits on top, without the black border. "Powered by
  woku" now shows the woku logo on every step, thank-you included, and opens woku.app (with UTM
  tags) in a new tab so the person never leaves the page they answer on. The iframe sandbox now allows
  popups (escaping the sandbox): without it the browser silently dropped every click on that
  link, the old text link included.

  The comment step shows the chosen rating (stars or score) and lets the person go back to
  change it until the response is sent.

  Review fixes: "Send without comment" checks identity like "Send" (a token-bound invitation
  needs who answers); a CES or CSAT tool that cannot load shows a short notice instead of a scale
  without its question; a response without its id fails instead of retrying forever; and rating
  again during the thank-you step is no longer folded away by its timer (`open` fires again).

## 0.3.1

### Patch Changes

- 52b0ba4: Remove `quarantines.check()` from the management SDK: the public API no longer
  exposes `GET /v1/quarantines/check` (quarantines are not managed from the admin
  anymore). Existing quarantines are still enforced when a respondent answers.
  The widget loader stops calling that endpoint before registering its triggers.

## 0.3.0

### Minor Changes

- 7f50ee3: Add authorized read-only follow-up conversations and typed ticket evidence
  metadata to the management SDK. Preserve explicit standalone/Flow capture
  provenance in mobile and widget submissions, and keep historical offline
  payloads and IDs unchanged during replay.

  Add explicit typed custom HTTP destination update contracts, retaining receiver
  event/case identity and original remote references.

## 0.2.0

### Minor Changes

- 4adb4ec: Add media uploads and safe journey enrollment iterators, synchronize generated
  API types and repair headers, URL scoping, pagination, cancellation and retry
  policies. React Native supports CSAT/CES and identified journey tokens, with
  company-scoped persistent captures and retained failures. Widget preserves
  identified journey context and validates both sides of its iframe bridge.

  Requires the API update that claims idempotency keys before writes. Deploy that
  server revision before publishing these SDK packages. No release is published by
  this changeset. Consult each package README for replay and storage limits.

### Patch Changes

- ddc40f5: Preserve confirmed capture results when local acknowledgement fails, stop sending
  cleared queue snapshots, bound response-body reading and normalize nested API
  errors. Reset Widget evaluation identity when changing prepared customer context
  and ignore initialization callbacks after destroying their original instance.
