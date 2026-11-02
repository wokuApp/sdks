/**
 * ScaleRating — 1-5 score picker for CES (effort) and CSAT (satisfaction).
 * Same boxes as the CES and CSAT pages of review.woku.app: bordered squares,
 * the selected one outlined in indigo, the two ends labelled underneath.
 */
import * as React from 'react';
import { cn } from './cn';

export interface ScaleRatingProps {
  value: number | undefined;
  onChange: (score: number) => void;
  lowLabel: string;
  highLabel: string;
  ariaLabel: string;
  className?: string;
}

export const ScaleRating = ({
  value,
  onChange,
  lowLabel,
  highLabel,
  ariaLabel,
  className,
}: ScaleRatingProps): React.ReactElement => (
  <div className={cn('flex flex-col gap-3', className)}>
    <div
      className="grid grid-cols-5 gap-2"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {[1, 2, 3, 4, 5].map((score) => {
        const selected = value === score;
        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={
              score === 1
                ? `1, ${lowLabel}`
                : score === 5
                  ? `5, ${highLabel}`
                  : String(score)
            }
            className={cn(
              'h-11 rounded-lg border text-lg font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 cursor-pointer',
              selected
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-neutral-200 text-neutral-900 hover:bg-neutral-50',
            )}
            onClick={() => onChange(score)}
          >
            {score}
          </button>
        );
      })}
    </div>
    <div className="flex justify-between px-1 text-xs text-neutral-500">
      <span>{lowLabel}</span>
      <span>{highLabel}</span>
    </div>
  </div>
);

ScaleRating.displayName = 'ScaleRating';
