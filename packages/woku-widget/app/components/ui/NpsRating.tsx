/**
 * NpsRating — 0-10 NPS score picker.
 * Mirroring the NpsRating pattern from review/Nps module.
 * 11 buttons 0-10, indigo-700 for selected.
 */
import * as React from 'react';
import { cn } from './cn';

export interface NpsRatingProps {
  value: number | undefined;
  onChange: (score: number) => void;
  detractorLabel?: string;
  promoterLabel?: string;
  ariaLabel?: string;
  className?: string;
}

function getNpsColor(score: number, selected: boolean): string {
  if (!selected) return 'bg-neutral-100 text-neutral-700 hover:bg-indigo-100 hover:text-indigo-700';
  if (score <= 6) return 'bg-red-500 text-white';
  if (score <= 8) return 'bg-yellow-500 text-white';
  return 'bg-emerald-600 text-white';
}

export const NpsRating = ({
  value,
  onChange,
  detractorLabel = 'Not at all likely',
  promoterLabel = 'Extremely likely',
  ariaLabel = 'NPS score 0 to 10',
  className,
}: NpsRatingProps): React.ReactElement => {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        className="flex flex-wrap justify-center gap-1.5"
        role="radiogroup"
        aria-label={ariaLabel}
      >
        {Array.from({ length: 11 }, (_, i) => i).map((score) => {
          const selected = value === score;
          return (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={String(score)}
              className={cn(
                'h-10 w-10 rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 cursor-pointer',
                getNpsColor(score, selected),
                selected && 'scale-110 shadow-md',
              )}
              onClick={() => onChange(score)}
            >
              {score}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between px-1 text-xs text-neutral-500">
        <span>{detractorLabel}</span>
        <span>{promoterLabel}</span>
      </div>
    </div>
  );
};

NpsRating.displayName = 'NpsRating';
