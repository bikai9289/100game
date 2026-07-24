import { ClarityAnalytics } from './clarity-analytics';
import { CloudflareWebAnalytics } from './cloudflare-web-analytics';
import { GoogleAnalytics } from './google-analytics';
import { PlausibleAnalytics } from './plausible-analytics';
import { UmamiAnalytics } from './umami-analytics';

/**
 * Renders all script-based analytics (only in production)
 */
export function Analytics() {
  if (!import.meta.env.PROD) return null;

  return (
    <>
      <GoogleAnalytics />
      <UmamiAnalytics />
      <PlausibleAnalytics />
      <ClarityAnalytics />
      <CloudflareWebAnalytics />
    </>
  );
}
