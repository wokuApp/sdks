/**
 * Qualifier — Stage 1.
 * Renders StarRating (woku), NpsRating (nps) or ScaleRating (ces/csat, with
 * the tool's own question). On selection, advances to the Feedback stage.
 */
import { useState, useEffect } from 'react';
import { StarRating } from '../ui/StarRating';
import { NpsRating } from '../ui/NpsRating';
import { ScaleRating } from '../ui/ScaleRating';
import { useWidgetContext } from '../../contexts/WidgetContext';
import type { Messages } from '../../i18n';

interface QualifierProps {
  messages: Messages;
}

export const Qualifier = ({ messages }: QualifierProps) => {
  const {
    config,
    wokuData,
    npsTool,
    scaleTool,
    qualification,
    setQualification,
    npsScore,
    setNpsScore,
    scaleScore,
    setScaleScore,
    setStep,
    loading,
  } = useWidgetContext();
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowTooltip(true), 500);
    const t2 = setTimeout(() => setShowTooltip(false), 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleStarChange = (v: number) => {
    setQualification(v);
    setTimeout(() => setStep('feedback'), 250);
  };

  const handleNpsChange = (score: number) => {
    setNpsScore(score);
    setTimeout(() => setStep('feedback'), 250);
  };

  const handleScaleChange = (score: number) => {
    setScaleScore(score);
    setTimeout(() => setStep('feedback'), 250);
  };

  const q = messages.qualifier;

  if (config.captureType === 'ces' || config.captureType === 'csat') {
    // The question comes from the tool: no scale without it.
    if (!scaleTool) {
      return loading ? (
        <div className="flex justify-center py-6" aria-hidden="true">
          <div className="h-6 w-6 rounded-full border-2 border-indigo-700 border-t-transparent animate-spin" />
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-neutral-600">
          {q.unavailable}
        </p>
      );
    }
    const isCes = config.captureType === 'ces';
    return (
      <div className="flex flex-col gap-4 py-2 relative">
        <p className="text-sm text-center font-medium text-neutral-800">
          {scaleTool?.question ?? ''}
        </p>
        {/* pb-10: room for the hint, which the iframe would clip outside. */}
        <div className="relative pb-10">
          <ScaleRating
            value={scaleScore}
            onChange={handleScaleChange}
            lowLabel={isCes ? q.cesLow : q.csatLow}
            highLabel={isCes ? q.cesHigh : q.csatHigh}
            ariaLabel={messages.aria.scaleRating}
          />
          {showTooltip && (
            <div className="absolute inset-x-0 bottom-0 mx-auto text-center">
              <TooltipBubble text={q.scaleTooltip} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (config.captureType === 'nps') {
    const question = npsTool?.npsMessage
      ? q.npsToolQuestion
          .replace('{target}', npsTool.npsMessage)
          .replace('{audience}', npsTool.audienceType || q.npsDefaultAudience)
      : q.npsQuestion;
    return (
      <div className="flex flex-col gap-4 py-2 relative">
        <p className="text-sm text-center text-neutral-700">{question}</p>
        {/* pb-10: room for the hint, which the iframe would clip outside. */}
        <div className="relative pb-10">
          <NpsRating
            value={npsScore}
            onChange={handleNpsChange}
            detractorLabel={q.npsDetractor}
            promoterLabel={q.npsPromoter}
            ariaLabel={messages.aria.npsRating}
          />
          {showTooltip && (
            <div className="absolute inset-x-0 bottom-0 mx-auto text-center">
              <TooltipBubble text={q.npsTooltip} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Woku mode
  return (
    <div className="flex flex-col gap-4 py-2 relative">
      {wokuData?.imageUrl && (
        // As on review.woku.app: a blurred cover fills the frame and the whole
        // image sits on top, so any aspect ratio fits the short frame.
        <div className="relative h-20 w-full overflow-hidden rounded-lg bg-neutral-100">
          <img
            src={wokuData.imageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover scale-110 blur-[5px]"
          />
          <div className="absolute inset-0 bg-white/20" aria-hidden="true" />
          <img
            src={wokuData.imageUrl}
            alt={wokuData.description ?? 'woku'}
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>
      )}
      <p className="text-xs text-center text-neutral-700">
        {q.rateUs}{' '}
        <span className="font-semibold">{wokuData?.description ?? ''}</span>
      </p>
      {/* pb-10: room for the hint, which the iframe would clip outside. */}
      <div className="relative pb-10">
        <StarRating
          value={qualification ?? 0}
          onChange={handleStarChange}
          size="md"
          badLabel={q.rateBad}
          goodLabel={q.rateGood}
          ariaLabel={messages.aria.starRating}
        />
        {showTooltip && (
          <div className="absolute inset-x-0 bottom-0 mx-auto text-center">
            <TooltipBubble text={q.tooltip} />
          </div>
        )}
      </div>
    </div>
  );
};

function TooltipBubble({ text }: { text: string }) {
  return (
    <div className="relative inline-block bg-neutral-900 rounded-md text-white py-2 px-3 text-xs shadow-md">
      <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-neutral-900 rotate-45 rounded-[2px]" />
      <span className="font-semibold">{text}</span>
    </div>
  );
}
