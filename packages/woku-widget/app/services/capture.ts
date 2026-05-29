/**
 * Ambivalent capture service.
 *
 * Selects the correct API endpoints based on captureType ('woku' | 'nps').
 *
 * Woku endpoints:
 *   GET  /v1/wokus/:id/review
 *   POST /v1/wokus/:id/textnotes  { qualification, description, clientEmail?, anonymous? }
 *   POST /v1/wokus/:id/voicemails  multipart: file, qualification, ...
 *
 * NPS endpoints (delivered by Etapa 05 — tested with mocks until ready):
 *   GET  /v1/nps-tool/:id
 *   POST /v1/nps              { score, npsToolId?, clientEmail?, anonymous? } → { npsId }
 *   POST /v1/nps/:id/textnotes  { description }
 *   POST /v1/nps/:id/voicemails  multipart: file
 *
 * Company branding (optional fetch):
 *   GET  /v1/companies/me
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface ApiHeaders {
  'x-woku-key': string;
  'Content-Type'?: string;
}

function buildHeaders(publishableKey: string, json = false): Record<string, string> {
  const h: Record<string, string> = { 'x-woku-key': publishableKey };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Woku capture types
// ---------------------------------------------------------------------------

export interface WokuReviewData {
  _id: string;
  description: string;
  imageUrl: string;
  anonymousDisabled: boolean;
}

export interface CreateWokuTextnoteParams {
  apiBaseUrl: string;
  publishableKey: string;
  wokuId: string;
  qualification: number; // 1-5
  description: string;
  clientEmail?: string;
  anonymous?: boolean;
}

export interface CreateWokuVoicemailParams {
  apiBaseUrl: string;
  publishableKey: string;
  wokuId: string;
  qualification: number; // 1-5
  file: Blob;
  clientEmail?: string;
  anonymous?: boolean;
}

// ---------------------------------------------------------------------------
// NPS capture types
// ---------------------------------------------------------------------------

export interface NpsToolData {
  _id: string;
  question?: string;
  companyId: string;
}

export interface CreateNpsParams {
  apiBaseUrl: string;
  publishableKey: string;
  score: number; // 0-10
  npsToolId?: string;
  clientEmail?: string;
  anonymous?: boolean;
}

export interface NpsSubmitResult {
  npsId: string;
}

export interface CreateNpsTextnoteParams {
  apiBaseUrl: string;
  publishableKey: string;
  npsId: string;
  description: string;
}

export interface CreateNpsVoicemailParams {
  apiBaseUrl: string;
  publishableKey: string;
  npsId: string;
  file: Blob;
}

// ---------------------------------------------------------------------------
// Woku API
// ---------------------------------------------------------------------------

export async function fetchWokuReview(
  apiBaseUrl: string,
  publishableKey: string,
  wokuId: string,
): Promise<WokuReviewData> {
  const res = await fetch(`${apiBaseUrl}/v1/wokus/${encodeURIComponent(wokuId)}/review`, {
    headers: buildHeaders(publishableKey),
  });
  return handleResponse<WokuReviewData>(res);
}

export async function createWokuTextnote(params: CreateWokuTextnoteParams): Promise<unknown> {
  const { apiBaseUrl, publishableKey, wokuId, qualification, description, clientEmail, anonymous } =
    params;

  const body: Record<string, unknown> = {
    qualification,
    description,
    ...(anonymous || !clientEmail ? { anonymous: true } : { clientEmail }),
  };

  const res = await fetch(
    `${apiBaseUrl}/v1/wokus/${encodeURIComponent(wokuId)}/textnotes`,
    {
      method: 'POST',
      headers: buildHeaders(publishableKey, true),
      body: JSON.stringify(body),
    },
  );
  return handleResponse(res);
}

export async function createWokuVoicemail(params: CreateWokuVoicemailParams): Promise<unknown> {
  const { apiBaseUrl, publishableKey, wokuId, qualification, file, clientEmail, anonymous } =
    params;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('filename', `audio-review-${Date.now()}`);
  formData.append('type', 'audio');
  formData.append('size', file.size.toString());
  formData.append('qualification', qualification.toString());
  if (clientEmail && !anonymous) formData.append('clientEmail', clientEmail);
  if (anonymous) formData.append('anonymous', 'true');

  const res = await fetch(
    `${apiBaseUrl}/v1/wokus/${encodeURIComponent(wokuId)}/voicemails`,
    {
      method: 'POST',
      headers: buildHeaders(publishableKey), // no Content-Type for multipart
      body: formData,
    },
  );
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// NPS API
// ---------------------------------------------------------------------------

export async function fetchNpsTool(
  apiBaseUrl: string,
  publishableKey: string,
  npsToolId: string,
): Promise<NpsToolData> {
  const res = await fetch(
    `${apiBaseUrl}/v1/nps-tool/${encodeURIComponent(npsToolId)}`,
    { headers: buildHeaders(publishableKey) },
  );
  return handleResponse<NpsToolData>(res);
}

export async function createNps(params: CreateNpsParams): Promise<NpsSubmitResult> {
  const { apiBaseUrl, publishableKey, score, npsToolId, clientEmail, anonymous } = params;

  const body: Record<string, unknown> = {
    score,
    ...(npsToolId ? { npsToolId } : {}),
    ...(anonymous || !clientEmail ? { anonymous: true } : { clientEmail }),
  };

  const res = await fetch(`${apiBaseUrl}/v1/nps`, {
    method: 'POST',
    headers: buildHeaders(publishableKey, true),
    body: JSON.stringify(body),
  });
  return handleResponse<NpsSubmitResult>(res);
}

export async function createNpsTextnote(params: CreateNpsTextnoteParams): Promise<unknown> {
  const { apiBaseUrl, publishableKey, npsId, description } = params;

  const res = await fetch(
    `${apiBaseUrl}/v1/nps/${encodeURIComponent(npsId)}/textnotes`,
    {
      method: 'POST',
      headers: buildHeaders(publishableKey, true),
      body: JSON.stringify({ description }),
    },
  );
  return handleResponse(res);
}

export async function createNpsVoicemail(params: CreateNpsVoicemailParams): Promise<unknown> {
  const { apiBaseUrl, publishableKey, npsId, file } = params;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('filename', `audio-nps-${Date.now()}`);
  formData.append('type', 'audio');
  formData.append('size', file.size.toString());

  const res = await fetch(
    `${apiBaseUrl}/v1/nps/${encodeURIComponent(npsId)}/voicemails`,
    {
      method: 'POST',
      headers: buildHeaders(publishableKey),
      body: formData,
    },
  );
  return handleResponse(res);
}

// ---------------------------------------------------------------------------
// Company branding
// ---------------------------------------------------------------------------

export interface CompanyBranding {
  name?: string;
  logoUrl?: string;
}

export async function fetchCompanyBranding(
  apiBaseUrl: string,
  publishableKey: string,
): Promise<CompanyBranding> {
  try {
    const res = await fetch(`${apiBaseUrl}/v1/companies/me`, {
      headers: buildHeaders(publishableKey),
    });
    return handleResponse<CompanyBranding>(res);
  } catch {
    return {};
  }
}
