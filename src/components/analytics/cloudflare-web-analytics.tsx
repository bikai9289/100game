import { ClientScript } from '@/components/shared/client-script';
import { clientEnv } from '@/env/client';

/**
 * Cloudflare Web Analytics
 * https://www.cloudflare.com/web-analytics/
 */
export function CloudflareWebAnalytics() {
  if (!import.meta.env.PROD) return null;
  const token = clientEnv.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
  if (!token) return null;

  return (
    <ClientScript
      src="https://static.cloudflareinsights.com/beacon.min.js"
      dataAttributes={{ cfBeacon: JSON.stringify({ token }) }}
    />
  );
}
