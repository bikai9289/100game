import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

type TurnstileWidgetModule = {
  getTurnstileSize?: (width: number) => 'compact' | 'flexible';
  loadTurnstileScript?: (options?: {
    timeoutMs?: number;
    setTimeoutFn?: (callback: () => void, delayMs: number) => number;
    clearTimeoutFn?: (timeout: number) => void;
  }) => Promise<void>;
  loadTurnstileScriptWithRetry?: (options: {
    load: () => Promise<void>;
    attempts?: number;
    sleep?: () => Promise<void>;
  }) => Promise<void>;
  createActiveTurnstileCallbacks?: (options: {
    onToken: (token: string) => void;
    isActive: () => boolean;
  }) => {
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
  };
};

class FakeScript {
  src = '';
  async = false;
  defer = false;
  removed = false;
  private listeners = new Map<string, () => void>();

  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type: string, listener: () => void) {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }

  emit(type: string) {
    this.listeners.get(type)?.();
  }

  remove() {
    this.removed = true;
  }
}

describe('Turnstile widget helpers', () => {
  it('uses compact below 300px and flexible from 300px', async () => {
    const widget = (await import(
      './turnstile-widget'
    )) as TurnstileWidgetModule;

    assert.equal(typeof widget.getTurnstileSize, 'function');
    assert.equal(widget.getTurnstileSize?.(299), 'compact');
    assert.equal(widget.getTurnstileSize?.(300), 'flexible');
  });

  it('times out a stalled script and clears it for a fresh attempt', async () => {
    const widget = (await import(
      './turnstile-widget'
    )) as TurnstileWidgetModule;
    const scripts: FakeScript[] = [];
    const timeouts: Array<() => void> = [];
    const fakeDocument = {
      querySelector: () => scripts.find((script) => !script.removed) ?? null,
      createElement: () => {
        const script = new FakeScript();
        scripts.push(script);
        return script;
      },
      head: { append: () => undefined },
    };
    const windowDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'window'
    );
    const documentDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'document'
    );
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { turnstile: undefined },
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: fakeDocument,
    });

    const options = {
      timeoutMs: 5_000,
      setTimeoutFn: (callback: () => void) => {
        timeouts.push(callback);
        return timeouts.length;
      },
      clearTimeoutFn: () => undefined,
    };
    try {
      const stalled = widget.loadTurnstileScript?.(options);
      assert.ok(stalled);
      assert.equal(timeouts.length, 1);
      timeouts[0]?.();
      await assert.rejects(stalled, /timed out/i);
      assert.equal(scripts[0]?.removed, true);

      const freshAttempt = widget.loadTurnstileScript?.(options);
      assert.ok(freshAttempt);
      assert.equal(scripts.length, 2);
      scripts[1]?.emit('error');
      await assert.rejects(freshAttempt, /failed to load/i);
    } finally {
      if (windowDescriptor) {
        Object.defineProperty(globalThis, 'window', windowDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'window');
      }
      if (documentDescriptor) {
        Object.defineProperty(globalThis, 'document', documentDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  it('removes a failed script and permits a fresh retry', async () => {
    const widget = (await import(
      './turnstile-widget'
    )) as TurnstileWidgetModule;
    assert.equal(typeof widget.loadTurnstileScript, 'function');

    const scripts: FakeScript[] = [];
    const fakeDocument = {
      querySelector: () => scripts.find((script) => !script.removed) ?? null,
      createElement: () => {
        const script = new FakeScript();
        scripts.push(script);
        return script;
      },
      head: { append: () => undefined },
    };
    const windowDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'window'
    );
    const documentDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'document'
    );
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { turnstile: undefined },
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: fakeDocument,
    });

    try {
      const firstAttempt = widget.loadTurnstileScript?.();
      assert.ok(firstAttempt);
      assert.equal(scripts.length, 1);
      scripts[0]?.emit('error');
      await assert.rejects(firstAttempt, /failed to load/i);
      assert.equal(scripts[0]?.removed, true);

      const retry = widget.loadTurnstileScript?.();
      assert.ok(retry);
      assert.notEqual(retry, firstAttempt);
      assert.equal(scripts.length, 2);
      scripts[1]?.emit('load');
      await retry;

      const loadedAgain = widget.loadTurnstileScript?.();
      assert.equal(loadedAgain, retry);
      assert.equal(scripts.length, 2);
    } finally {
      if (windowDescriptor) {
        Object.defineProperty(globalThis, 'window', windowDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'window');
      }
      if (documentDescriptor) {
        Object.defineProperty(globalThis, 'document', documentDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  it('retries script loading twice before succeeding', async () => {
    const widget = (await import(
      './turnstile-widget'
    )) as TurnstileWidgetModule;
    assert.equal(typeof widget.loadTurnstileScriptWithRetry, 'function');

    let calls = 0;
    await widget.loadTurnstileScriptWithRetry?.({
      load: async () => {
        calls += 1;
        if (calls < 3) throw new Error('temporary failure');
      },
      attempts: 3,
      sleep: async () => undefined,
    });

    assert.equal(calls, 3);
  });

  it('stops retrying after the configured attempt limit', async () => {
    const widget = (await import(
      './turnstile-widget'
    )) as TurnstileWidgetModule;
    assert.equal(typeof widget.loadTurnstileScriptWithRetry, 'function');

    let calls = 0;
    await assert.rejects(
      widget.loadTurnstileScriptWithRetry?.({
        load: async () => {
          calls += 1;
          throw new Error('still unavailable');
        },
        attempts: 3,
        sleep: async () => undefined,
      }),
      /still unavailable/
    );
    assert.equal(calls, 3);
  });

  it('guards every callback after its widget becomes inactive', async () => {
    const widget = (await import(
      './turnstile-widget'
    )) as TurnstileWidgetModule;
    assert.equal(typeof widget.createActiveTurnstileCallbacks, 'function');

    let active = true;
    const tokens: string[] = [];
    const callbacks = widget.createActiveTurnstileCallbacks?.({
      onToken: (token) => tokens.push(token),
      isActive: () => active,
    });
    assert.ok(callbacks);
    callbacks.callback('fresh-token');

    active = false;
    callbacks.callback('stale-token');
    callbacks['expired-callback']();
    callbacks['error-callback']();

    assert.deepEqual(tokens, ['fresh-token']);
  });
});
