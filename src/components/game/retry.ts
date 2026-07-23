type RetryOptions = {
  attempts?: number;
  delayMs?: number;
  signal?: AbortSignal;
  isCurrent?: () => boolean;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
};

function abortError() {
  return new DOMException('The retry operation was cancelled.', 'AbortError');
}

function assertActive(signal?: AbortSignal, isCurrent?: () => boolean) {
  if (signal?.aborted || (isCurrent && !isCurrent())) throw abortError();
}

function waitForRetry(delayMs: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, delayMs);
    const handleAbort = () => {
      clearTimeout(timeout);
      reject(abortError());
    };
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

export async function retryWithPolicy<T>(
  operation: (attempt: number) => Promise<T>,
  {
    attempts = 3,
    delayMs = 150,
    signal,
    isCurrent,
    shouldRetry = () => true,
    sleep = waitForRetry,
  }: RetryOptions = {}
): Promise<T> {
  const attemptLimit = Math.max(1, Math.floor(attempts));

  for (let attempt = 1; attempt <= attemptLimit; attempt += 1) {
    assertActive(signal, isCurrent);
    try {
      const result = await operation(attempt);
      assertActive(signal, isCurrent);
      return result;
    } catch (error) {
      assertActive(signal, isCurrent);
      if (attempt === attemptLimit || !shouldRetry(error, attempt)) throw error;
      await sleep(delayMs, signal);
    }
  }

  throw new Error('Retry attempt limit must be positive.');
}
