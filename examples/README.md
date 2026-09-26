# SDK journey examples

`journey-hybrid.ts` uploads a local image and prepares four business moments:
purchase (CSAT), delivery (Woku with a conditional webhook description), product
use (CES), and recommendation (NPS). It leaves the journey disabled and does not
send messages. Its request types compile against the current API contract.

Use `WOKU_API_KEY` on a backend. `journeys.mintMomentUrl` returns a credential-bearing
URL that belongs in the sender's secret configuration, not logs. For sender HMAC,
set the sender secret with `journeys.setSenderSecret` and sign the exact request
bytes. Send webhooks with a separate HTTP transport so the management key is never
forwarded to the ingress URL.

Respond from a mobile app using the public key and the captured `dispatchToken`:
Woku/NPS/CSAT/CES all support identified journey responses. The React Native SDK
persists a submission before delivery; awaiting `capture*` returns its outcome.
