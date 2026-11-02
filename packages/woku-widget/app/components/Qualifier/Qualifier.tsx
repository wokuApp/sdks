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
    setQualification,
    setNpsScore,
    setScaleScore,
    setStep,
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
    const isCes = config.captureType === 'ces';
    return (
      <div className="flex flex-col gap-4 py-2 relative">
        <p className="text-sm text-center font-medium text-neutral-800">
          {scaleTool?.question ?? ''}
        </p>
        {/* pb-10: room for the hint, which the iframe would clip outside. */}
        <div className="relative pb-10">
          <ScaleRating
            value={undefined}
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
            value={undefined}
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
        <img
          src={wokuData.imageUrl}
          alt="Woku"
          className="object-cover h-20 w-full rounded-lg border shadow"
        />
      )}
      <p className="text-xs text-center text-neutral-700">
        {q.rateUs}{' '}
        <span className="font-semibold">{wokuData?.description ?? ''}</span>
      </p>
      {/* pb-10: room for the hint, which the iframe would clip outside. */}
      <div className="relative pb-10">
        <StarRating
          value={0}
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
