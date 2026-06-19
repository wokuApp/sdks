---
"@wokuapp/react-native": minor
---

Audio captures are now delivered. When a submission has `audio`, the SDK sends a `multipart/form-data` request to `/v1/captures` (the `audio.uri` file plus a `payload` field) and the server stores it as a voicemail review; text/rating and score captures stay JSON. The `HttpClient` request `body` may now be a `FormData`.
