/**
 * Qualifier — Stage 1.
 * Renders StarRating (woku mode) or NpsRating (nps mode).
 * On selection, advances to the Feedback stage.
 */
import { useState, useEffect } from 'react';
import { StarRating } from '../ui/StarRating';
import { NpsRating } from '../ui/NpsRating';
import { useWidgetContext } from '../../contexts/WidgetContext';
import type { Messages } from '../../i18n';

interface QualifierProps {
  messages: Messages;
}

export const Qualifier = ({ messages }: QualifierProps) => {
  const { config, wokuData, setQualification, setNpsScore, setStep } = useWidgetContext();
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

  const q = messages.qualifier;

  if (config.captureType === 'nps') {
    return (
      <div className="flex flex-col gap-4 py-2 relative">
        <p className="text-sm text-center text-neutral-700">{q.npsQuestion}</p>
        <div className="relative">
          <NpsRating
            value={undefined}
            onChange={handleNpsChange}
            detractorLabel={q.npsDetractor}
            promoterLabel={q.npsPromoter}
            ariaLabel={messages.aria.npsRating}
          />
          {showTooltip && (
            <div className="absolute inset-x-0 -bottom-10 mx-auto text-center">
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
      <div className="relative">
        <StarRating
          value={0}
          onChange={handleStarChange}
          size="md"
          badLabel={q.rateBad}
          goodLabel={q.rateGood}
          ariaLabel={messages.aria.starRating}
        />
        {showTooltip && (
          <div className="absolute inset-x-0 -bottom-10 mx-auto text-center">
            <TooltipBubble text={q.tooltip} />
          </div>
        )}
      </div>
    </div>
  );
};

function TooltipBubble({ text }: { text: string }) {
  return (
    <div className="relative inline-block bg-indigo-600 rounded-lg text-white py-2 px-3 text-xs shadow-md">
      <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-indigo-600 rotate-45 rounded-[2px]" />
      <span className="font-semibold">{text}</span>
    </div>
  );
}
