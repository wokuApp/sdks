---
"@wokuapp/react-native": major
"@wokuapp/woku-widget": major
---

Declare the inbound response channel on every capture.

- woku-widget: sends `responseChannel: 'widget-web'` on the v1 woku textnote/voicemail and NPS create calls, so admin shows the channel per response.
- react-native: posts to the resource-oriented `/v1/captures` (was the non-existent `/sdk/v1/captures`); the woku-server seals the channel to `'mobile-sdk'` for that endpoint. This changes the ingest path, hence the major bump.
