import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { Woku } from '../woku';
import { WokuAPIError } from '../core/errors';

const BASE = 'http://api.test';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('uploads image bytes with a filename and lets fetch set the multipart boundary', async () => {
  server.use(
    http.post(`${BASE}/v1/woku-media`, async ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer sk_test');
      expect(request.headers.get('content-type')).toMatch(
        /^multipart\/form-data; boundary=/,
      );
      const form = await request.formData();
      const file = form.get('file') as File;
      expect(file.name).toBe('delivery.png');
      expect(new Uint8Array(await file.arrayBuffer())).toEqual(
        new Uint8Array([0, 127, 128, 255]),
      );
      return HttpResponse.json({
        fileId: 'f1',
        filename: 'image.webp',
        type: 'image',
      });
    }),
  );
  const sdk = new Woku({
    apiKey: 'sk_test',
    baseURL: BASE,
    defaultHeaders: { 'content-type': 'application/json' },
  });
  expect(
    await sdk.media.upload({
      file: new Uint8Array([0, 127, 128, 255]),
      filename: 'delivery.png',
      contentType: 'image/png',
    }),
  ).toEqual({ fileId: 'f1', filename: 'image.webp', type: 'image' });
});

it('does not retry an upload even when a caller supplies a key and retry budget', async () => {
  let calls = 0;
  server.use(
    http.post(`${BASE}/v1/woku-media`, () => {
      calls++;
      return HttpResponse.json(
        { message: 'storage unavailable' },
        { status: 503 },
      );
    }),
  );
  const sdk = new Woku({ apiKey: 'sk_test', baseURL: BASE });
  await expect(
    sdk.media.upload(
      {
        file: new Blob(['mp4'], { type: 'video/mp4' }),
        filename: 'sample.mp4',
      },
      { idempotencyKey: 'caller-key', maxRetries: 3 },
    ),
  ).rejects.toBeInstanceOf(WokuAPIError);
  expect(calls).toBe(1);
});

it('preserves upload 413 status and request id', async () => {
  server.use(
    http.post(`${BASE}/v1/woku-media`, () =>
      HttpResponse.json(
        { message: 'File too large' },
        { status: 413, headers: { 'x-request-id': 'media-limit' } },
      ),
    ),
  );
  const sdk = new Woku({ apiKey: 'sk_test', baseURL: BASE });
  await expect(
    sdk.media.upload({ file: new Blob(['large']), filename: 'test.mp4' }),
  ).rejects.toMatchObject({
    status: 413,
    requestId: 'media-limit',
    code: 'payload_too_large',
  });
});
