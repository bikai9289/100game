import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');

describe('Cloudflare deployment workflow', () => {
  it('runs all quality gates before building and deploying', () => {
    const check = workflow.indexOf('run: pnpm check');
    const localeCheck = workflow.indexOf('run: pnpm locale:check');
    const tests = workflow.indexOf("-name '*.test.ts'");
    const build = workflow.indexOf('run: pnpm build');
    const deploy = workflow.indexOf('wrangler deploy');

    assert.ok(check > 0, 'pnpm check must run');
    assert.ok(localeCheck > check, 'locale:check must run after check');
    assert.ok(
      tests > localeCheck,
      'all test files must run after locale:check'
    );
    assert.ok(build > tests, 'build must run after the quality gates');
    assert.ok(deploy > build, 'deploy must run after the build');
  });

  it('publishes one version containing all Worker secrets', () => {
    assert.match(workflow, /write-worker-secrets-file\.ts/);
    assert.match(
      workflow,
      /wrangler deploy[^\n]+--secrets-file "\$WORKER_SECRETS_FILE"/
    );
    assert.match(workflow, /trap 'rm -f "\$WORKER_SECRETS_FILE"' EXIT/);
    assert.doesNotMatch(workflow, /wrangler secret (?:put|bulk)/);
  });
});
