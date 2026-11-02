/**
 * Feedback — Stage 2.
 * Text or audio input. Calls the correct endpoint (woku, nps, ces or csat).
 * For score tools (nps, ces, csat) the comment is optional: sending without
 * it still records the score. Icons via lucide-react.
 */
import { ChangeEvent, useState, useEffect, useRef } from 'react';
import { Mic, Trash2, Square, Mail } from 'lucide-react';
import AudioRecorder from '../common/AudioRecorder';
import { Button } from '../ui/Button';
import { useWidgetContext } from '../../contexts/WidgetContext';
import { sendToHost } from '../../bridge';
import {
  createWokuTextnote,
  createWokuVoicemail,
  createNps,
  createNpsTextnote,
  createNpsVoicemail,
  createScaleResponse,
  createScaleTextnote,
  createScaleVoicemail,
} from '../../services/capture';
import type { Messages } from '../../i18n';

interface FeedbackProps {
  messages: Messages;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Feedback = ({ messages }: FeedbackProps) => {
  const {
    config,
    qualification,
    npsScore,
    textnote,
    setTextnote,
    email,
    setEmail,
    anonymous,
    setAnonymous,
    isInitialEmail,
    wokuData,
    npsId: existingNpsId,
    setNpsId,
    scaleScore,
    scaleTool,
    scaleResponseId,
    setScaleResponseId,
    setStep,
  } = useWidgetContext();
  const isScoreTool = config.captureType !== 'woku';

  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showMicTooltip, setShowMicTooltip] = useState(false);
  const [showEmailTooltip, setShowEmailTooltip] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [recording, setRecording] = useState(false);
  const [feedbackAudio, setFeedbackAudio] = useState<Blob | undefined>(
    undefined,
  );
  const [isSending, setIsSending] = useState(false);
  const [visible, setVisible] = useState(false);

  const emailIsValid = !email || EMAIL_REGEX.test(email);

  // Capture latest values in refs to avoid stale closure in async handlers
  const feedbackAudioRef = useRef(feedbackAudio);
  feedbackAudioRef.current = feedbackAudio;
  const isSendingRef = useRef(isSending);
  isSendingRef.current = isSending;

  const f = messages.feedback;
  const id = messages.identity;

  useEffect(() => {
    const t1 = setTimeout(() => setShowMicTooltip(true), 500);
    const t2 = setTimeout(() => setShowMicTooltip(false), 5000);
    setTimeout(() => setVisible(true), 50);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (showAudioRecorder || (textnote && textnote.length > 0)) {
      setShowMicTooltip(false);
    }
  }, [showAudioRecorder, textnote]);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setTextnote(e.target.value);
  };

  const handleAudioButtonClick = () => {
    setShowMicTooltip(false);
    setShowAudioRecorder(true);
  };

  const stopRecording = () => setRecording(false);

  const deleteRecord = () => {
    setRecording(false);
    setFeedbackAudio(undefined);
    setShowAudioRecorder(false);
  };

  const handleSubmit = async () => {
    if (isSendingRef.current) return;
    const requiresIdentity =
      Boolean(config.dispatchToken) || Boolean(wokuData?.anonymousDisabled);
    if (requiresIdentity && !email && !config.phone) {
      setShowEmailTooltip(true);
      return;
    }
    if (!emailIsValid && !anonymous) {
      setShowEmailTooltip(true);
      setTimeout(() => setShowEmailTooltip(false), 5000);
      return;
    }

    if (!textnote && !feedbackAudio) return;

    isSendingRef.current = true;
    setIsSending(true);

    try {
      if (config.captureType === 'woku') {
        await submitWoku();
      } else if (config.captureType === 'nps') {
        await submitNps(true);
      } else {
        await submitScale(true);
      }

      setStep('thank');
      notifySubmitted(true);
    } catch (err) {
      console.error('[WokuWidget] Submit error:', err);
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const submitWoku = async () => {
    const wokuId = config.wokuId ?? wokuData?._id ?? '';
    const q = qualification ?? 1;

    if (textnote && textnote.length > 0) {
      await createWokuTextnote({
        apiBaseUrl: config.apiBaseUrl,
        publishableKey: config.publishableKey,
        collectionKind: config.collectionKind,
        flowId: config.flowId,
        wokuId,
        qualification: q,
        description: textnote,
        ...(anonymous || (!email && !config.phone)
          ? { anonymous: true }
          : {
              ...(email ? { clientEmail: email } : {}),
              ...(config.phone ? { clientPhone: config.phone } : {}),
            }),
        dispatchToken: config.dispatchToken,
      });
    }

    if (feedbackAudio) {
      stopRecording();
      await createWokuVoicemail({
        apiBaseUrl: config.apiBaseUrl,
        publishableKey: config.publishableKey,
        collectionKind: config.collectionKind,
        flowId: config.flowId,
        wokuId,
        qualification: q,
        file: feedbackAudio,
        ...(anonymous || (!email && !config.phone)
          ? { anonymous: true }
          : {
              ...(email ? { clientEmail: email } : {}),
              ...(config.phone ? { clientPhone: config.phone } : {}),
            }),
        dispatchToken: config.dispatchToken,
      });
    }
  };

  const identity = () =>
    anonymous || (!email && !config.phone)
      ? { anonymous: true }
      : {
          ...(email ? { clientEmail: email } : {}),
          ...(config.phone ? { clientPhone: config.phone } : {}),
        };

  const notifySubmitted = (comment: boolean) =>
    sendToHost('woku:submit', {
      captureType: config.captureType,
      qualification,
      npsScore,
      score: scaleScore,
      comment,
    });

  const submitScale = async (withComment: boolean) => {
    const kind = config.captureType === 'ces' ? 'ces' : 'csat';
    const toolId =
      (kind === 'ces' ? config.cesToolId : config.csatToolId) ??
      scaleTool?._id ??
      '';
    const responseId =
      scaleResponseId ??
      (await createScaleResponse({
        kind,
        apiBaseUrl: config.apiBaseUrl,
        publishableKey: config.publishableKey,
        collectionKind: config.collectionKind,
        flowId: config.flowId,
        toolId,
        score: scaleScore ?? 1,
        ...identity(),
        dispatchToken: config.dispatchToken,
      }));
    setScaleResponseId(responseId);
    if (!withComment) return;

    const common = {
      kind,
      apiBaseUrl: config.apiBaseUrl,
      publishableKey: config.publishableKey,
      responseId,
    } as const;
    if (textnote && textnote.length > 0)
      await createScaleTextnote({ ...common, description: textnote });
    if (feedbackAudio) {
      stopRecording();
      await createScaleVoicemail({ ...common, file: feedbackAudio });
    }
  };

  const submitNps = async (withComment: boolean) => {
    const score = npsScore ?? 0;

    // POST /v1/nps first to get the npsId
    const npsId =
      existingNpsId ??
      (
        await createNps({
          apiBaseUrl: config.apiBaseUrl,
          publishableKey: config.publishableKey,
          collectionKind: config.collectionKind,
          flowId: config.flowId,
          score,
          npsToolId: config.npsToolId,
          ...(anonymous || (!email && !config.phone)
            ? { anonymous: true }
            : {
                ...(email ? { clientEmail: email } : {}),
                ...(config.phone ? { clientPhone: config.phone } : {}),
              }),
          dispatchToken: config.dispatchToken,
        })
      ).npsId;

    setNpsId(npsId);
    if (!withComment) return;

    if (textnote && textnote.length > 0) {
      await createNpsTextnote({
        apiBaseUrl: config.apiBaseUrl,
        publishableKey: config.publishableKey,
        collectionKind: config.collectionKind,
        flowId: config.flowId,
        npsId,
        description: textnote,
      });
    }

    if (feedbackAudio) {
      stopRecording();
      await createNpsVoicemail({
        apiBaseUrl: config.apiBaseUrl,
        publishableKey: config.publishableKey,
        collectionKind: config.collectionKind,
        flowId: config.flowId,
        npsId,
        file: feedbackAudio,
      });
    }
  };

  const handleSkip = async () => {
    if (!isScoreTool) {
      setStep('thank');
      sendToHost('woku:skip');
      return;
    }
    // A score tool's comment is optional: keep the score that was chosen.
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);
    try {
      if (config.captureType === 'nps') await submitNps(false);
      else await submitScale(false);
      setStep('thank');
      notifySubmitted(false);
    } catch (err) {
      console.error('[WokuWidget] Submit error:', err);
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const hasContent = Boolean(textnote) || Boolean(feedbackAudio);

  return (
    <div
      className={`flex flex-col gap-2 h-full transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <p className="text-center text-sm text-neutral-700">
        {isScoreTool ? f.scoreTitle : f.title}
      </p>

      <div className="h-full w-full flex flex-col gap-1">
        {/* Email / identity row */}
        {!isInitialEmail && !config.phone && (
          <div className="relative">
            <div className="flex items-center gap-2 text-xs py-1">
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <Mail className="h-4 w-4 flex-none text-neutral-500" />
                {anonymous ? (
                  <span className="text-neutral-500">{id.anonymous}</span>
                ) : (
                  <input
                    type="email"
                    value={email ?? ''}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`flex-1 min-w-0 bg-white rounded border px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-neutral-400 ${
                      email && !emailIsValid
                        ? 'border-red-500 text-red-500'
                        : 'border-neutral-300'
                    }`}
                    placeholder={id.emailPlaceholder}
                  />
                )}
              </div>
              {!wokuData?.anonymousDisabled && !config.dispatchToken && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={anonymous}
                    onClick={() => setAnonymous(!anonymous)}
                    className={`rounded-full w-7 h-4 flex items-center px-0.5 transition-colors ${
                      anonymous
                        ? 'bg-indigo-600 justify-end'
                        : 'bg-neutral-300 justify-start'
                    }`}
                  >
                    <div className="rounded-full h-3 w-3 bg-white shadow" />
                  </button>
                  <span
                    className={
                      anonymous
                        ? 'font-semibold text-xs'
                        : 'text-xs text-neutral-500'
                    }
                  >
                    {id.anonymous}
                  </span>
                </div>
              )}
            </div>
            {showEmailTooltip && (
              <div className="absolute left-1 -top-10 z-50">
                <div className="relative bg-neutral-900 rounded-md text-white py-2 px-3 text-xs shadow-md">
                  <div className="absolute left-4 -bottom-1.5 w-3 h-3 bg-neutral-900 rotate-45 rounded-[2px]" />
                  {f.emailRequired}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Text/Audio input */}
        {showAudioRecorder ? (
          <AudioRecorder
            mediaRecorder={mediaRecorder}
            setMediaRecorder={setMediaRecorder}
            recording={recording}
            setRecording={setRecording}
            setAudio={(blob) => setFeedbackAudio(blob ?? undefined)}
          />
        ) : (
          <textarea
            placeholder={f.placeholder}
            className="grow h-full border border-neutral-300 rounded-md p-2 w-full text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            value={textnote ?? ''}
            onChange={handleTextChange}
            rows={3}
          />
        )}

        {/* Audio recorder controls */}
        {showAudioRecorder && (
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              disabled={isSending}
              onClick={deleteRecord}
              className="flex flex-col items-center gap-0.5 text-indigo-700 disabled:opacity-50"
            >
              <Trash2 className="h-5 w-5" />
              <span className="text-xs">{f.delete}</span>
            </button>
            {recording && (
              <button
                type="button"
                onClick={stopRecording}
                className="flex flex-col items-center gap-0.5 text-red-600"
              >
                <Square className="h-6 w-6" />
                <span className="text-xs">{f.stop}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Actions: send on top; skip (or keep the score) with the voice note
          button below, as on the review.woku.app feedback step. */}
      <Button
        fullWidth
        disabled={isSending || !hasContent}
        loading={isSending}
        onClick={() => void handleSubmit()}
      >
        {hasContent ? f.send : f.pending}
      </Button>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          fullWidth
          disabled={isSending}
          onClick={() => void handleSkip()}
        >
          {isScoreTool ? f.sendWithoutComment : f.skip}
        </Button>

        {!textnote && (
          <div className="relative shrink-0">
            <button
              type="button"
              disabled={recording}
              onClick={handleAudioButtonClick}
              className="h-10 w-10 rounded-full bg-indigo-700 text-white hover:bg-indigo-500 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              aria-label={f.recordAudio}
            >
              <Mic className="h-4 w-4" />
            </button>
            {showMicTooltip && (
              <div className="absolute -right-1 bottom-12 w-28 text-center text-xs">
                <div className="relative bg-neutral-900 rounded-md text-white py-2 px-3 shadow-md">
                  <div className="absolute right-5 -bottom-1.5 w-3 h-3 bg-neutral-900 rotate-45 rounded-[2px]" />
                  <span className="font-semibold">{f.recordAudio}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
