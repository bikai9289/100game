'use client';

import answersData from '@/data/answers-women.json';
import {
  initGame,
  normalizeInput,
  submitAnswer,
  type Answer,
  type GameState,
} from '@/lib/gameEngine';
import { cn } from '@/lib/utils';
import { IconRefresh, IconTrophy } from '@tabler/icons-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

const TARGET_SCORE = 100;
const STORAGE_KEY = 'name100:women:v1';
const STORAGE_COOKIE = 'name100_women_v1';
const answers = answersData as Answer[];

const categoryStyles: Record<string, string> = {
  actresses:
    'border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-100',
  musicians:
    'border-violet-300 bg-violet-100 text-violet-950 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-100',
  athletes:
    'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100',
  scientists:
    'border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-100',
  politicians:
    'border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100',
  historical:
    'border-fuchsia-300 bg-fuchsia-100 text-fuchsia-950 dark:border-fuchsia-500/40 dark:bg-fuchsia-500/15 dark:text-fuchsia-100',
  business:
    'border-cyan-300 bg-cyan-100 text-cyan-950 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-100',
  activists:
    'border-lime-300 bg-lime-100 text-lime-950 dark:border-lime-500/40 dark:bg-lime-500/15 dark:text-lime-100',
  other:
    'border-zinc-300 bg-zinc-100 text-zinc-950 dark:border-zinc-500/40 dark:bg-zinc-500/15 dark:text-zinc-100',
};

type StoredGame = {
  guessedNames: string[];
  remainingTime: number;
  isGameOver: boolean;
  isStarted: boolean;
};

function readStoredGame(): StoredGame | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as StoredGame;
  } catch {
    // Try cookie fallback below.
  }

  try {
    const cookie = document.cookie
      .split('; ')
      .find((item) => item.startsWith(`${STORAGE_COOKIE}=`));
    if (!cookie) return null;

    return JSON.parse(
      decodeURIComponent(cookie.slice(STORAGE_COOKIE.length + 1))
    ) as StoredGame;
  } catch {
    return null;
  }
}

function persistGame(state: GameState, started: boolean) {
  const stored: StoredGame = {
    guessedNames: state.guessedAnswers.map((answer) => answer.name),
    remainingTime: state.remainingTime,
    isGameOver: state.isGameOver,
    isStarted: started,
  };
  const serialized = JSON.stringify(stored);

  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
    return;
  } catch {
    // Fall back to a first-party cookie when localStorage is blocked.
  }

  try {
    // biome-ignore lint/suspicious/noDocumentCookie: fallback only when localStorage is unavailable.
    document.cookie = `${STORAGE_COOKIE}=${encodeURIComponent(
      serialized
    )}; path=/; max-age=2592000; SameSite=Lax`;
  } catch {
    // Gameplay must continue even if progress cannot be persisted.
  }
}

function clearStoredGame() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore unavailable storage APIs.
  }

  try {
    // biome-ignore lint/suspicious/noDocumentCookie: clears the fallback cookie.
    document.cookie = `${STORAGE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    // Ignore unavailable cookie APIs.
  }
}

export function Name100Game() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [gameState, setGameState] = useState<GameState>(() =>
    initGame(answers)
  );
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [hasRestoredGame, setHasRestoredGame] = useState(false);
  const guessedKeys = useMemo(
    () =>
      new Set(
        gameState.guessedAnswers.map((answer) => normalizeInput(answer.name))
      ),
    [gameState.guessedAnswers]
  );
  const missedAnswers = useMemo(
    () =>
      answers
        .filter((answer) => !guessedKeys.has(normalizeInput(answer.name)))
        .slice(0, TARGET_SCORE),
    [guessedKeys]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    try {
      const parsed = readStoredGame();
      if (!parsed) {
        setHasRestoredGame(true);
        return;
      }

      const guessedAnswers = parsed.guessedNames
        .map((name) =>
          answers.find(
            (answer) => normalizeInput(answer.name) === normalizeInput(name)
          )
        )
        .filter((answer): answer is Answer => Boolean(answer));

      setGameState({
        ...initGame(answers),
        score: guessedAnswers.length,
        guessedAnswers,
        remainingTime: Math.max(0, parsed.remainingTime),
        isGameOver: parsed.isGameOver,
      });
      setIsStarted(parsed.isStarted && !parsed.isGameOver);
    } catch {
      clearStoredGame();
    } finally {
      setHasRestoredGame(true);
    }
  }, []);

  useEffect(() => {
    if (!hasRestoredGame) return;

    persistGame(gameState, isStarted);
  }, [gameState, hasRestoredGame, isStarted]);

  useEffect(() => {
    if (!isStarted || gameState.isGameOver) return;

    const interval = window.setInterval(() => {
      setGameState((current) => {
        if (current.remainingTime <= 1) {
          return { ...current, remainingTime: 0, isGameOver: true };
        }

        return { ...current, remainingTime: current.remainingTime - 1 };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [gameState.isGameOver, isStarted]);

  const minutes = Math.floor(gameState.remainingTime / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (gameState.remainingTime % 60).toString().padStart(2, '0');
  const progress = Math.min(100, (gameState.score / TARGET_SCORE) * 100);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (gameState.isGameOver) return;

    const formData = new FormData(event.currentTarget);
    const value = String(formData.get('answer') ?? input).trim();
    if (!value) {
      setMessage('Type a name to make a guess.');
      return;
    }

    setIsStarted(true);
    const result = submitAnswer(value, gameState, answers);
    const nextState =
      result.newState.score >= TARGET_SCORE
        ? { ...result.newState, isGameOver: true }
        : result.newState;

    if (result.isDuplicate) {
      setMessage('Already guessed!');
    } else if (result.isCorrect) {
      setMessage(`${result.newState.guessedAnswers.at(-1)?.name} counts.`);
      setInput('');
    } else {
      setMessage('Not in the answer list yet. Try another famous woman.');
    }

    setGameState(nextState);
    persistGame(nextState, true);
  }

  function resetGame() {
    const nextState = initGame(answers);
    setGameState(nextState);
    setInput('');
    setMessage('');
    setIsStarted(false);
    clearStoredGame();
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <section
      aria-label="Name 100 Women game"
      className="mx-auto w-full max-w-4xl rounded-lg border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="sticky top-16 z-10 -mx-4 -mt-4 border-b bg-card/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mt-0 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-md border bg-background px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Time
            </div>
            <div className="font-mono text-2xl font-bold tabular-nums">
              {minutes}:{seconds}
            </div>
          </div>
          <div className="hidden h-10 w-px bg-border sm:block" />
          <div className="rounded-md border bg-background px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Score
            </div>
            <div className="font-mono text-2xl font-bold tabular-nums">
              {gameState.score} / {TARGET_SCORE}
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <label htmlFor="name100-input" className="sr-only">
          Type a famous woman's name
        </label>
        <input
          ref={inputRef}
          id="name100-input"
          name="answer"
          value={input}
          disabled={gameState.isGameOver}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          placeholder="Type a famous woman's name..."
          onChange={(event) => setInput(event.target.value)}
          className="h-14 w-full rounded-lg border border-input bg-background px-4 text-lg font-semibold outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </form>

      <div
        aria-live="polite"
        className="mt-3 min-h-6 text-sm font-medium text-muted-foreground"
      >
        {message ||
          (isStarted
            ? 'Keep going. Think by category.'
            : 'Press Enter after each name. Your timer starts on the first guess.')}
      </div>

      <div className="mt-4 max-h-52 overflow-y-auto rounded-lg border bg-background/70 p-3">
        {gameState.guessedAnswers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {gameState.guessedAnswers.map((answer) => (
              <span
                key={answer.name}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm font-semibold',
                  categoryStyles[answer.category] ?? categoryStyles.other
                )}
              >
                {answer.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Correct answers will appear here as colorful category tags.
          </p>
        )}
      </div>

      {gameState.isGameOver ? (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-lg font-bold">
            <IconTrophy className="size-5 text-primary" />
            Final score: {gameState.score} / {TARGET_SCORE}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Nice run. Review a few names you missed, then start again and try to
            beat your score.
          </p>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Show missed answer examples
            </summary>
            <div className="mt-3 max-h-40 overflow-y-auto text-sm text-muted-foreground">
              {missedAnswers.map((answer) => answer.name).join(', ')}
            </div>
          </details>
          <button
            type="button"
            onClick={resetGame}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <IconRefresh className="size-4" />
            Play Again
          </button>
        </div>
      ) : null}
    </section>
  );
}
