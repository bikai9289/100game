'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link, useSearch } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

const presets = [3, 5, 12] as const;

export function TimerTool() {
  const search = useSearch({ strict: false }) as { t?: string };
  const initialMinutes = useMemo(() => {
    const parsed = Number(search.t);
    return presets.includes(parsed as (typeof presets)[number]) ? parsed : 12;
  }, [search.t]);
  const [minutes, setMinutes] = useState(initialMinutes);
  const [remaining, setRemaining] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    setMinutes(initialMinutes);
    setRemaining(initialMinutes * 60);
    setIsRunning(false);
    setIsFinished(false);
  }, [initialMinutes]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          setIsRunning(false);
          setIsFinished(true);
          playBeep();
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  function selectMinutes(value: number) {
    setMinutes(value);
    setRemaining(value * 60);
    setIsRunning(false);
    setIsFinished(false);
  }

  function reset() {
    setRemaining(minutes * 60);
    setIsRunning(false);
    setIsFinished(false);
  }

  const minuteLabel = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0');
  const secondLabel = (remaining % 60).toString().padStart(2, '0');

  return (
    <section className="mx-auto max-w-3xl rounded-xl border bg-card p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap justify-center gap-3">
        {presets.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant={minutes === preset ? 'default' : 'outline'}
            size="lg"
            onClick={() => selectMinutes(preset)}
            className="min-w-24"
          >
            {preset} minutes
          </Button>
        ))}
      </div>

      <div
        className={cn(
          'mx-auto mt-8 rounded-xl border bg-background px-6 py-8 text-center font-mono text-6xl font-black tabular-nums sm:text-8xl',
          isFinished && 'border-primary text-primary'
        )}
      >
        {minuteLabel}:{secondLabel}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button
          type="button"
          size="lg"
          onClick={() => setIsRunning((current) => !current)}
        >
          {isRunning ? 'Pause' : 'Start'}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={reset}>
          Reset
        </Button>
        <Button variant="secondary" size="lg" render={<Link to="/" />}>
          Use this timer for the main game
        </Button>
      </div>

      <p
        aria-live="polite"
        className="mt-4 min-h-6 text-center font-semibold text-primary"
      >
        {isFinished ? "Time's up!" : ''}
      </p>
    </section>
  );
}

function playBeep() {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
  } catch {
    // Audio is optional; browsers may block it without user interaction.
  }
}
