/**
 * PoweredByWoku — the "Powered by woku" mark, as on review.woku.app: the
 * label plus the woku logo, linking to woku.app with UTM tags. It opens a new
 * tab so the person never leaves the page they are answering on.
 * `rel="noopener"` without `noreferrer` keeps the referrer for analytics.
 */
import * as React from 'react';
import { cn } from './cn';
import { WokuLogo } from './WokuLogo';

const landingUrl = (campaign: string): string =>
  `https://woku.app/?${new URLSearchParams({
    utm_source: 'widget',
    utm_medium: 'powered_by',
    utm_campaign: campaign,
  }).toString()}`;

export const PoweredByWoku = ({
  label,
  campaign,
  className,
}: {
  label: string;
  /** Capture type of the widget, sent as `utm_campaign`. */
  campaign: string;
  className?: string;
}): React.ReactElement => (
  <a
    href={landingUrl(campaign)}
    target="_blank"
    rel="noopener"
    className={cn('flex items-center justify-center gap-1', className)}
  >
    <span className="text-xs text-neutral-500">{label}</span>
    <WokuLogo className="inline-block h-3 w-auto mb-0.5" />
  </a>
);

PoweredByWoku.displayName = 'PoweredByWoku';
