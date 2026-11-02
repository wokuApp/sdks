/**
 * Ambivalent capture service.
 *
 * Selects the correct API endpoints based on captureType
 * ('woku' | 'nps' | 'ces' | 'csat').
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
 * CES / CSAT endpoints (1-5 score, the question comes from the tool):
 *   GET  /v1/ces-tool/:id?lang=     | GET  /v1/csat-tool/:id?lang=
 *   POST /v1/ces  { cesToolId, score, clientEmail?, anonymous? } → { cesId }
 *   POST /v1/csat { csatToolId, score, clientEmail?, anonymous? } → { csatId }
 *   POST /v1/{ces|csat}/:id/textnotes  { description }
 *   POST /v1/{ces|csat}/:id/voicemails multipart: file
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

function buildHeaders(
  publishableKey: string,
  json = false,
): Record<string, string> {
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

interface CaptureContext {
  collectionKind?: 'standalone' | 'flow';
  flowId?: string;
}

export interface CreateWokuTextnoteParams extends CaptureContext {
  apiBaseUrl: string;
  publishableKey: string;
  wokuId: string;
  qualification: number; // 1-5
  description: string;
  clientEmail?: string;
  clientPhone?: string;
  dispatchToken?: string;
  anonymous?: boolean;
}

export interface CreateWokuVoicemailParams extends CaptureContext {
  apiBaseUrl: string;
  publishableKey: string;
  wokuId: string;
  qualification: number; // 1-5
  file: Blob;
  clientEmail?: string;
  clientPhone?: string;
  dispatchToken?: string;
  anonymous?: boolean;
}

// ---------------------------------------------------------------------------
// NPS capture types
// ---------------------------------------------------------------------------

export interface NpsToolData {
  _id: string;
  name?: string;
  /** What is being recommended (e.g. the company or a product). */
  npsMessage?: string;
  /** Who it would be recommended to. */
  audienceType?: string;
}

export interface CreateNpsParams extends CaptureContext {
  apiBaseUrl: string;
  publishableKey: string;
  score: number; // 0-10
  npsToolId?: string;
  clientEmail?: string;
  clientPhone?: string;
  dispatchToken?: string;
  anonymous?: boolean;
}

export interface NpsSubmitResult {
  npsId: string;
}

export interface CreateNpsTextnoteParams extends CaptureContext {
  apiBaseUrl: string;
  publishableKey: string;
  npsId: string;
  description: string;
}

export interface CreateNpsVoicemailParams extends CaptureContext {
  apiBaseUrl: string;
  publishableKey: string;
  npsId: string;
  file: Blob;
}

// ---------------------------------------------------------------------------
// Woku API
// ---------------------------------------------------------------------------

interface ReviewerWoku {
  _id?: string;
  description?: string;
  imageUrl?: string;
  anonymousDisabled?: boolean;
  file?: { type?: string; url?: string } | null;
  localizedContent?: { locale?: string; description?: string }[] | null;
}

/**
 * The API answers with the reviewer payload `{ woku, users, company }` (the
 * same the review app reads). Older or mocked servers answered with a flat
 * woku; both normalize to what the widget renders.
 */
export async function fetchWokuReview(
  apiBaseUrl: string,
  publishableKey: string,
  wokuId: string,
  lang?: string,
): Promise<WokuReviewData> {
  const res = await fetch(
    `${apiBaseUrl}/v1/wokus/${encodeURIComponent(wokuId)}/review`,
    {
      headers: buildHeaders(publishableKey),
    },
  );
  const body = await handleResponse<{ woku?: ReviewerWoku } & ReviewerWoku>(
    res,
  );
  const woku: ReviewerWoku = body.woku ?? body;
  const language = (lang ?? '').split('-')[0].toLowerCase();
  const localized = language
    ? woku.localizedContent?.find(
        (entry) => entry.locale?.toLowerCase() === language,
      )?.description
    : undefined;
  const fileImage =
    woku.file && woku.file.type !== 'video' ? (woku.file.url ?? '') : '';
  return {
    _id: woku._id ?? wokuId,
    description: localized || woku.description || '',
    imageUrl: woku.imageUrl ?? fileImage,
    anonymousDisabled: Boolean(woku.anonymousDisabled),
  };
}

export async function createWokuTextnote(
  params: CreateWokuTextnoteParams,
): Promise<unknown> {
  const {
    apiBaseUrl,
    publishableKey,
    wokuId,
    qualification,
    description,
    clientEmail,
    clientPhone,
    dispatchToken,
    anonymous,
  } = params;

  const body: Record<string, unknown> = {
    qualification,
    description,
    responseChannel: 'widget-web',
    collectionKind: params.collectionKind ?? 'standalone',
    ...(params.flowId ? { flowId: params.flowId } : {}),
    ...(anonymous || (!clientEmail && !clientPhone)
      ? { anonymous: true }
      : {
          ...(clientEmail ? { clientEmail } : {}),
          ...(clientPhone ? { clientPhone } : {}),
        }),
    ...(dispatchToken ? { dispatchToken } : {}),
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

export async function createWokuVoicemail(
  params: CreateWokuVoicemailParams,
): Promise<unknown> {
  const {
    apiBaseUrl,
    publishableKey,
    wokuId,
    qualification,
    file,
    clientEmail,
    clientPhone,
    dispatchToken,
    anonymous,
  } = params;

  const formData = new FormData();
  formData.append('collectionKind', params.collectionKind ?? 'standalone');
  if (params.flowId) formData.append('flowId', params.flowId);
  formData.append('file', file);
  formData.append('filename', `audio-review-${Date.now()}`);
  formData.append('type', 'audio');
  formData.append('size', file.size.toString());
  formData.append('qualification', qualification.toString());
  formData.append('responseChannel', 'widget-web');
  if (clientEmail && !anonymous) formData.append('clientEmail', clientEmail);
  if (clientPhone && !anonymous) formData.append('clientPhone', clientPhone);
  if (dispatchToken) formData.append('dispatchToken', dispatchToken);
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

const langQuery = (lang: string | undefined): string =>
  lang ? `?lang=${encodeURIComponent(lang)}` : '';

export async function fetchNpsTool(
  apiBaseUrl: string,
  publishableKey: string,
  npsToolId: string,
  lang?: string,
): Promise<NpsToolData> {
  const res = await fetch(
    `${apiBaseUrl}/v1/nps-tool/${encodeURIComponent(npsToolId)}${langQuery(lang)}`,
    { headers: buildHeaders(publishableKey) },
  );
  return handleResponse<NpsToolData>(res);
}

export async function createNps(
  params: CreateNpsParams,
): Promise<NpsSubmitResult> {
  const {
    apiBaseUrl,
    publishableKey,
    score,
    npsToolId,
    clientEmail,
    clientPhone,
    dispatchToken,
    anonymous,
  } = params;

  const body: Record<string, unknown> = {
    score,
    responseChannel: 'widget-web',
    collectionKind: params.collectionKind ?? 'standalone',
    ...(params.flowId ? { flowId: params.flowId } : {}),
    ...(npsToolId ? { npsToolId } : {}),
    ...(anonymous || (!clientEmail && !clientPhone)
      ? { anonymous: true }
      : {
          ...(clientEmail ? { clientEmail } : {}),
          ...(clientPhone ? { clientPhone } : {}),
        }),
    ...(dispatchToken ? { dispatchToken } : {}),
  };

  const res = await fetch(`${apiBaseUrl}/v1/nps`, {
    method: 'POST',
    headers: buildHeaders(publishableKey, true),
    body: JSON.stringify(body),
  });
  return handleResponse<NpsSubmitResult>(res);
}

export async function createNpsTextnote(
  params: CreateNpsTextnoteParams,
): Promise<unknown> {
  const { apiBaseUrl, publishableKey, npsId, description } = params;

  const res = await fetch(
    `${apiBaseUrl}/v1/nps/${encodeURIComponent(npsId)}/textnotes`,
    {
      method: 'POST',
      headers: buildHeaders(publishableKey, true),
      body: JSON.stringify({
        description,
        collectionKind: params.collectionKind ?? 'standalone',
        ...(params.flowId ? { flowId: params.flowId } : {}),
      }),
    },
  );
  return handleResponse(res);
}

export async function createNpsVoicemail(
  params: CreateNpsVoicemailParams,
): Promise<unknown> {
  const { apiBaseUrl, publishableKey, npsId, file } = params;

  const formData = new FormData();
  formData.append('collectionKind', params.collectionKind ?? 'standalone');
  if (params.flowId) formData.append('flowId', params.flowId);
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
// CES / CSAT API
// ---------------------------------------------------------------------------

export type ScaleKind = 'ces' | 'csat';

export interface ScaleToolData {
  _id: string;
  name?: string;
  /** The question respondents see, in the requested language when available. */
  question: string;
  action?: string | null;
  subject?: string | null;
}

export async function fetchScaleTool(
  kind: ScaleKind,
  apiBaseUrl: string,
  publishableKey: string,
  toolId: string,
  lang: string | undefined,
): Promise<ScaleToolData> {
  const res = await fetch(
    `${apiBaseUrl}/v1/${kind}-tool/${encodeURIComponent(toolId)}${langQuery(lang)}`,
    { headers: buildHeaders(publishableKey) },
  );
  return handleResponse<ScaleToolData>(res);
}

export interface CreateScaleResponseParams extends CaptureContext {
  kind: ScaleKind;
  apiBaseUrl: string;
  publishableKey: string;
  toolId: string;
  score: number; // 1-5
  clientEmail?: string;
  clientPhone?: string;
  dispatchToken?: string;
  anonymous?: boolean;
}

/** Capture a CES or CSAT score; returns the response id for its comment. */
export async function createScaleResponse(
  params: CreateScaleResponseParams,
): Promise<string> {
  const { kind, apiBaseUrl, publishableKey, toolId, score } = params;
  const { clientEmail, clientPhone, dispatchToken, anonymous } = params;
  const body: Record<string, unknown> = {
    [kind === 'ces' ? 'cesToolId' : 'csatToolId']: toolId,
    score,
    ...(anonymous || (!clientEmail && !clientPhone)
      ? { anonymous: true }
      : {
          ...(clientEmail ? { clientEmail } : {}),
          ...(clientPhone ? { clientPhone } : {}),
        }),
    responseChannel: 'widget-web',
    collectionKind: params.collectionKind ?? 'standalone',
    ...(params.flowId ? { flowId: params.flowId } : {}),
    ...(dispatchToken ? { dispatchToken } : {}),
  };
  const res = await fetch(`${apiBaseUrl}/v1/${kind}`, {
    method: 'POST',
    headers: buildHeaders(publishableKey, true),
    body: JSON.stringify(body),
  });
  const created = await handleResponse<Record<string, string | undefined>>(res);
  const id = created[kind === 'ces' ? 'cesId' : 'csatId'];
  // Without its id the comment could never attach: a failed capture.
  if (!id) throw new Error(`The ${kind} response returned no id`);
  return id;
}

export interface CreateScaleTextnoteParams {
  kind: ScaleKind;
  apiBaseUrl: string;
  publishableKey: string;
  responseId: string;
  description: string;
}

export async function createScaleTextnote(
  params: CreateScaleTextnoteParams,
): Promise<unknown> {
  const { kind, apiBaseUrl, publishableKey, responseId, description } = params;
  const res = await fetch(
    `${apiBaseUrl}/v1/${kind}/${encodeURIComponent(responseId)}/textnotes`,
    {
      method: 'POST',
      headers: buildHeaders(publishableKey, true),
      body: JSON.stringify({ description }),
    },
  );
  return handleResponse(res);
}

export interface CreateScaleVoicemailParams {
  kind: ScaleKind;
  apiBaseUrl: string;
  publishableKey: string;
  responseId: string;
  file: Blob;
}

export async function createScaleVoicemail(
  params: CreateScaleVoicemailParams,
): Promise<unknown> {
  const { kind, apiBaseUrl, publishableKey, responseId, file } = params;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('filename', `audio-${kind}-${Date.now()}`);
  formData.append('type', 'audio');
  formData.append('size', file.size.toString());
  const res = await fetch(
    `${apiBaseUrl}/v1/${kind}/${encodeURIComponent(responseId)}/voicemails`,
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
    return await handleResponse<CompanyBranding>(res);
  } catch {
    return {};
  }
}
