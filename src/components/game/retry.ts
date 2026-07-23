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

function abortReason(signal: AbortSignal) {
  return signal.reason instanceof Error ? signal.reason : abortError();
}

export function throwIfRetryCancelled(
  signal?: AbortSignal,
  isCurrent?: () => boolean
) {
  if (signal?.aborted) throw abortReason(signal);
  if (isCurrent && !isCurrent()) throw abortError();
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
    throwIfRetryCancelled(signal, isCurrent);
    try {
      const result = await operation(attempt);
      throwIfRetryCancelled(signal, isCurrent);
      return result;
    } catch (error) {
      throwIfRetryCancelled(signal, isCurrent);
      if (attempt === attemptLimit || !shouldRetry(error, attempt)) throw error;
      await sleep(delayMs, signal);
    }
  }

  throw new Error('Retry attempt limit must be positive.');
}

export async function runWithAbortTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  { timeoutMs, parentSignal }: { timeoutMs: number; parentSignal?: AbortSignal }
): Promise<T> {
  const controller = new AbortController();
  const abortFromParent = () =>
    controller.abort(parentSignal ? abortReason(parentSignal) : abortError());
  if (parentSignal?.aborted) abortFromParent();
  else parentSignal?.addEventListener('abort', abortFromParent, { once: true });

  const timeout = setTimeout(
    () =>
      controller.abort(
        new DOMException('The operation timed out.', 'TimeoutError')
      ),
    Math.max(0, timeoutMs)
  );
  let handleAttemptAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    handleAttemptAbort = () => reject(abortReason(controller.signal));
    if (controller.signal.aborted) handleAttemptAbort();
    else {
      controller.signal.addEventListener('abort', handleAttemptAbort, {
        once: true,
      });
    }
  });

  try {
    return await Promise.race([operation(controller.signal), aborted]);
  } finally {
    clearTimeout(timeout);
    if (handleAttemptAbort) {
      controller.signal.removeEventListener('abort', handleAttemptAbort);
    }
    parentSignal?.removeEventListener('abort', abortFromParent);
  }
}
