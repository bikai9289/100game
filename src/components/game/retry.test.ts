import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

type RetryModule = {
  retryWithPolicy?: <T>(
    operation: (attempt: number) => Promise<T>,
    options?: {
      attempts?: number;
      signal?: AbortSignal;
      isCurrent?: () => boolean;
      sleep?: () => Promise<void>;
    }
  ) => Promise<T>;
  runWithAbortTimeout?: <T>(
    operation: (signal: AbortSignal) => Promise<T>,
    options: { timeoutMs: number; parentSignal?: AbortSignal }
  ) => Promise<T>;
};

async function getRetryModule() {
  return (await import('./retry').catch(() => ({}))) as RetryModule;
}

describe('retryWithPolicy', () => {
  it('returns a recovered result within the attempt limit', async () => {
    const retry = await getRetryModule();
    assert.equal(typeof retry.retryWithPolicy, 'function');

    const attempts: number[] = [];
    const result = await retry.retryWithPolicy?.(
      async (attempt) => {
        attempts.push(attempt);
        if (attempt < 3) throw new Error('temporary');
        return 'recovered';
      },
      { attempts: 3, sleep: async () => undefined }
    );

    assert.equal(result, 'recovered');
    assert.deepEqual(attempts, [1, 2, 3]);
  });

  it('returns the final error after exhausting retries', async () => {
    const retry = await getRetryModule();
    assert.equal(typeof retry.retryWithPolicy, 'function');

    let calls = 0;
    await assert.rejects(
      retry.retryWithPolicy?.(
        async () => {
          calls += 1;
          throw new Error(`failure-${calls}`);
        },
        { attempts: 3, sleep: async () => undefined }
      ),
      /failure-3/
    );
    assert.equal(calls, 3);
  });

  it('stops before another attempt after cancellation', async () => {
    const retry = await getRetryModule();
    assert.equal(typeof retry.retryWithPolicy, 'function');

    const controller = new AbortController();
    let calls = 0;
    await assert.rejects(
      retry.retryWithPolicy?.(
        async () => {
          calls += 1;
          throw new Error('temporary');
        },
        {
          attempts: 3,
          signal: controller.signal,
          sleep: async () => controller.abort(),
        }
      ),
      { name: 'AbortError' }
    );
    assert.equal(calls, 1);
  });

  it('stops when the owning round generation is stale', async () => {
    const retry = await getRetryModule();
    assert.equal(typeof retry.retryWithPolicy, 'function');

    let generation = 1;
    let calls = 0;
    await assert.rejects(
      retry.retryWithPolicy?.(
        async () => {
          calls += 1;
          throw new Error('temporary');
        },
        {
          attempts: 3,
          isCurrent: () => generation === 1,
          sleep: async () => {
            generation = 2;
          },
        }
      ),
      { name: 'AbortError' }
    );
    assert.equal(calls, 1);
  });

  it('does not return a successful result from a stale generation', async () => {
    const retry = await getRetryModule();
    assert.equal(typeof retry.retryWithPolicy, 'function');

    let generation = 1;
    await assert.rejects(
      retry.retryWithPolicy?.(
        async () => {
          generation = 2;
          return 'stale result';
        },
        { isCurrent: () => generation === 1 }
      ),
      { name: 'AbortError' }
    );
  });

  it('aborts an operation when its attempt timeout expires', async () => {
    const retry = await getRetryModule();
    assert.equal(typeof retry.runWithAbortTimeout, 'function');

    await assert.rejects(
      retry.runWithAbortTimeout?.(
        (signal) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason), {
              once: true,
            });
          }),
        { timeoutMs: 5 }
      ),
      { name: 'TimeoutError' }
    );
  });

  it('propagates parent cancellation to an active attempt', async () => {
    const retry = await getRetryModule();
    assert.equal(typeof retry.runWithAbortTimeout, 'function');

    const parent = new AbortController();
    const pending = retry.runWithAbortTimeout?.(
      (signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          });
        }),
      { timeoutMs: 1_000, parentSignal: parent.signal }
    );
    parent.abort();

    await assert.rejects(pending, { name: 'AbortError' });
  });
});
