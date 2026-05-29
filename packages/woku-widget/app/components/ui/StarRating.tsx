/**
 * StarRating — 1-5 interactive stars, mirroring review/StarRating.tsx.
 * No next-intl dependency: labels passed as props.
 */
import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from './cn';

export interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  labels?: [string, string, string, string, string];
  badLabel?: string;
  goodLabel?: string;
  ariaLabel?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
};

const touchClasses = {
  sm: 'min-w-[36px] min-h-[36px]',
  md: 'min-w-[44px] min-h-[44px]',
  lg: 'min-w-[48px] min-h-[48px]',
};

export const StarRating = ({
  value,
  onChange,
  readonly = false,
  size = 'md',
  labels,
  badLabel = '',
  goodLabel = '',
  ariaLabel = 'Star rating',
  className,
}: StarRatingProps): React.ReactElement => {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);
  const displayValue = hoverValue ?? value;

  const handleClick = (v: number) => {
    if (!readonly && onChange) onChange(v);
  };

  const handleKey = (e: React.KeyboardEvent, v: number) => {
    if (readonly) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange?.(v);
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="flex gap-1" role="radiogroup" aria-label={ariaLabel}>
        {[1, 2, 3, 4, 5].map((v) => {
          const filled = v <= displayValue;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={v === value}
              aria-label={labels ? `${v} - ${labels[v - 1]}` : String(v)}
              disabled={readonly}
              className={cn(
                'flex items-center justify-center transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
                touchClasses[size],
                !readonly && 'cursor-pointer hover:scale-105',
                readonly && 'cursor-default',
              )}
              onClick={() => handleClick(v)}
              onKeyDown={(e) => handleKey(e, v)}
              onMouseEnter={() => !readonly && setHoverValue(v)}
              onMouseLeave={() => !readonly && setHoverValue(null)}
              tabIndex={readonly ? -1 : 0}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'transition-colors',
                  filled
                    ? 'fill-yellow-500 stroke-yellow-500'
                    : 'fill-transparent stroke-neutral-300',
                )}
              />
            </button>
          );
        })}
      </div>
      {(badLabel || goodLabel) && (
        <div className="flex w-full justify-between px-2 text-xs text-neutral-500">
          <span>{badLabel}</span>
          <span>{goodLabel}</span>
        </div>
      )}
      {labels && displayValue > 0 && (
        <span className="text-xs font-medium text-yellow-800">{labels[displayValue - 1]}</span>
      )}
    </div>
  );
};

StarRating.displayName = 'StarRating';
