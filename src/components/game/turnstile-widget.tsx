'use client';

import { retryWithPolicy } from '@/components/game/retry';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

type TurnstileSize = 'compact' | 'flexible';

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: 'score' | 'comment';
      size: TurnstileSize;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    }
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise: Promise<void> | null = null;

export function getTurnstileSize(width: number): TurnstileSize {
  return width < 300 ? 'compact' : 'flexible';
}

export function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`
    );
    const script = existing ?? document.createElement('script');

    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => {
        script.remove();
        reject(new Error('Turnstile failed to load.'));
      },
      { once: true }
    );

    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }
  }).catch((error: unknown) => {
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
}

export function loadTurnstileScriptWithRetry({
  load = loadTurnstileScript,
  attempts = 3,
  delayMs = 150,
  signal,
  sleep,
}: {
  load?: () => Promise<void>;
  attempts?: number;
  delayMs?: number;
  signal?: AbortSignal;
  sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
} = {}) {
  return retryWithPolicy(() => load(), {
    attempts,
    delayMs,
    signal,
    sleep,
  });
}

export type TurnstileWidgetHandle = { reset: () => void };

export const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  {
    siteKey: string;
    action: 'score' | 'comment';
    onToken: (token: string) => void;
  }
>(function TurnstileWidget({ siteKey, action, onToken }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [size, setSize] = useState<TurnstileSize | null>(null);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current) {
        window.turnstile?.reset(widgetIdRef.current);
      }
      onToken('');
    },
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = (width: number) => {
      const nextSize = getTurnstileSize(width);
      setSize((current) => (current === nextSize ? current : nextSize));
    };
    updateSize(container.getBoundingClientRect().width);

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      updateSize(width ?? container.getBoundingClientRect().width);
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!size) return;

    let cancelled = false;
    let widgetId: string | null = null;
    const controller = new AbortController();
    onToken('');

    void loadTurnstileScriptWithRetry({ signal: controller.signal })
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;

        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          size,
          callback: onToken,
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
        });
        widgetIdRef.current = widgetId;
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) onToken('');
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (widgetId) {
        window.turnstile?.remove(widgetId);
      }
      if (widgetIdRef.current === widgetId) {
        widgetIdRef.current = null;
      }
    };
  }, [action, onToken, siteKey, size]);

  return (
    <div
      ref={containerRef}
      className="w-full min-w-0"
      style={{ minHeight: size === 'flexible' ? 65 : 140 }}
    />
  );
});
