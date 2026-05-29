/**
 * Quarantine check — query the backend before injecting the iframe.
 * If the respondent is in quarantine the widget must not show.
 *
 * The endpoint is optional: if the check fails for any network reason
 * we default to NOT quarantined so we never silently hide the widget.
 */
export async function isInQuarantine(
  apiBaseUrl: string,
  companyId: string,
  publishableKey: string,
): Promise<boolean> {
  try {
    const url = `${apiBaseUrl}/v1/quarantines/check?companyId=${encodeURIComponent(companyId)}`;
    const response = await fetch(url, {
      headers: { 'x-woku-key': publishableKey },
    });

    if (!response.ok) return false;

    const data = (await response.json()) as { quarantined?: boolean };
    return Boolean(data.quarantined);
  } catch {
    // Network error — default to not quarantined so widget can still show.
    return false;
  }
}
