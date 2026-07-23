import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

type TurnstileWidgetModule = {
  getTurnstileSize?: (width: number) => 'compact' | 'flexible';
  loadTurnstileScript?: () => Promise<void>;
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
});
