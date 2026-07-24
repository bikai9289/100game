import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('analytics source', () => {
  it('wires Cloudflare Web Analytics through the shared analytics component', () => {
    const env = readFileSync('src/env/client.ts', 'utf8');
    const analytics = readFileSync(
      'src/components/analytics/analytics.tsx',
      'utf8'
    );
    const cloudflare = readFileSync(
      'src/components/analytics/cloudflare-web-analytics.tsx',
      'utf8'
    );
    const deployWorkflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
    const envExample = readFileSync('.env.example', 'utf8');

    assert.match(env, /VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN/);
    assert.match(envExample, /VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN=''/);
    assert.match(
      deployWorkflow,
      /VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN: \$\{\{ secrets\.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN \}\}/
    );
    assert.match(analytics, /CloudflareWebAnalytics/);
    assert.match(
      cloudflare,
      /https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js/
    );
    assert.match(cloudflare, /dataAttributes=\{\{ cfBeacon:/);
    assert.match(cloudflare, /JSON\.stringify\(\{ token \}\)/);
  });
});
