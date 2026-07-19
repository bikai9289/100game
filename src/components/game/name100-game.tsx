'use client';

import defaultAnswersData from '@/data/answers-women.json';
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

const defaultAnswers = defaultAnswersData as Answer[];

const categoryStyles: Record<string, string> = {
  actresses:
    'border-white/25 bg-[#FF6B9D] text-white shadow-[0_0_18px_rgba(255,107,157,0.35)]',
  musicians:
    'border-white/25 bg-[#C77DFF] text-white shadow-[0_0_18px_rgba(199,125,255,0.35)]',
  athletes:
    'border-white/25 bg-[#06FFA5] text-slate-950 shadow-[0_0_18px_rgba(6,255,165,0.32)]',
  scientists:
    'border-white/25 bg-[#4ECDC4] text-slate-950 shadow-[0_0_18px_rgba(78,205,196,0.32)]',
  politicians:
    'border-white/25 bg-[#FFE66D] text-slate-950 shadow-[0_0_18px_rgba(255,230,109,0.28)]',
  historical:
    'border-white/25 bg-[#FF8C42] text-white shadow-[0_0_18px_rgba(255,140,66,0.32)]',
  business:
    'border-white/25 bg-[#A8DADC] text-slate-950 shadow-[0_0_18px_rgba(168,218,220,0.28)]',
  activists:
    'border-white/25 bg-[#F1FA8C] text-slate-950 shadow-[0_0_18px_rgba(241,250,140,0.28)]',
  other:
    'border-white/25 bg-[#BD93F9] text-white shadow-[0_0_18px_rgba(189,147,249,0.32)]',
};

type StoredGame = {
  guessedNames: string[];
  remainingTime: number;
  isGameOver: boolean;
  isStarted: boolean;
};

type Name100GameProps = {
  answers?: Answer[];
  targetScore?: number;
  durationSeconds?: number;
  storageKey?: string;
  storageCookie?: string;
  ariaLabel?: string;
  placeholder?: string;
  emptyTagsText?: string;
  activeHint?: string;
  idleHint?: string;
  missText?: string;
};

function readStoredGame(storageKey: string, storageCookie: string) {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) return JSON.parse(stored) as StoredGame;
  } catch {
    // Try cookie fallback below.
  }

  try {
    const cookie = document.cookie
      .split('; ')
      .find((item) => item.startsWith(`${storageCookie}=`));
    if (!cookie) return null;

    return JSON.parse(
      decodeURIComponent(cookie.slice(storageCookie.length + 1))
    ) as StoredGame;
  } catch {
    return null;
  }
}

function persistGame(
  state: GameState,
  started: boolean,
  storageKey: string,
  storageCookie: string
) {
  const stored: StoredGame = {
    guessedNames: state.guessedAnswers.map((answer) => answer.name),
    remainingTime: state.remainingTime,
    isGameOver: state.isGameOver,
    isStarted: started,
  };
  const serialized = JSON.stringify(stored);

  try {
    window.localStorage.setItem(storageKey, serialized);
    return;
  } catch {
    // Fall back to a first-party cookie when localStorage is blocked.
  }

  try {
    // biome-ignore lint/suspicious/noDocumentCookie: fallback only when localStorage is unavailable.
    document.cookie = `${storageCookie}=${encodeURIComponent(
      serialized
    )}; path=/; max-age=2592000; SameSite=Lax`;
  } catch {
    // Gameplay must continue even if progress cannot be persisted.
  }
}

function clearStoredGame(storageKey: string, storageCookie: string) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore unavailable storage APIs.
  }

  try {
    // biome-ignore lint/suspicious/noDocumentCookie: clears the fallback cookie.
    document.cookie = `${storageCookie}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    // Ignore unavailable cookie APIs.
  }
}

export function Name100Game({
  answers = defaultAnswers,
  targetScore = 100,
  durationSeconds = 720,
  storageKey = 'name100:women:v1',
  storageCookie = 'name100_women_v1',
  ariaLabel = 'Name 100 Women game',
  placeholder = "Type a famous woman's name...",
  emptyTagsText = 'Correct answers will appear here as colorful category tags.',
  activeHint = 'Keep going. Think by category.',
  idleHint = 'Press Enter after each name. Your timer starts on the first guess.',
  missText = 'Not in the answer list yet. Try another famous person.',
}: Name100GameProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [gameState, setGameState] = useState<GameState>(() =>
    initGame(answers, { durationSeconds })
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
        .slice(0, targetScore),
    [answers, guessedKeys, targetScore]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    try {
      const parsed = readStoredGame(storageKey, storageCookie);
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
        ...initGame(answers, { durationSeconds }),
        score: guessedAnswers.length,
        guessedAnswers,
        remainingTime: Math.max(0, parsed.remainingTime),
        isGameOver: parsed.isGameOver,
      });
      setIsStarted(parsed.isStarted && !parsed.isGameOver);
    } catch {
      clearStoredGame(storageKey, storageCookie);
    } finally {
      setHasRestoredGame(true);
    }
  }, [answers, durationSeconds, storageCookie, storageKey]);

  useEffect(() => {
    if (!hasRestoredGame) return;

    persistGame(gameState, isStarted, storageKey, storageCookie);
  }, [gameState, hasRestoredGame, isStarted, storageCookie, storageKey]);

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
  const progress = Math.min(100, (gameState.score / targetScore) * 100);

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
    const result = submitAnswer(value, gameState, answers, { targetScore });
    const nextState =
      result.newState.score >= targetScore
        ? { ...result.newState, isGameOver: true }
        : result.newState;

    if (result.isDuplicate) {
      setMessage('Already guessed!');
    } else if (result.isCorrect) {
      setMessage(`${result.newState.guessedAnswers.at(-1)?.name} counts.`);
      setInput('');
    } else {
      setMessage(missText);
    }

    setGameState(nextState);
    persistGame(nextState, true, storageKey, storageCookie);
  }

  function resetGame() {
    const nextState = initGame(answers, { durationSeconds });
    setGameState(nextState);
    setInput('');
    setMessage('');
    setIsStarted(false);
    clearStoredGame(storageKey, storageCookie);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <section
      aria-label={ariaLabel}
      className="relative mx-auto w-full max-w-full overflow-hidden rounded-[2rem] border border-white/20 bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)] p-4 text-white shadow-2xl shadow-indigo-950/35 sm:max-w-4xl sm:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-white/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-cyan-300/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18)_0,transparent_28%),radial-gradient(circle_at_80%_0%,rgba(6,255,165,0.13)_0,transparent_26%)]"
      />

      <div className="relative">
        <form onSubmit={handleSubmit}>
          <label htmlFor={`name100-input-${storageKey}`} className="sr-only">
            Type a famous person's name
          </label>
          <input
            ref={inputRef}
            id={`name100-input-${storageKey}`}
            name="answer"
            value={input}
            disabled={gameState.isGameOver}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            placeholder={placeholder}
            onChange={(event) => setInput(event.target.value)}
            className="h-16 w-full rounded-2xl border-2 border-white/60 bg-white/95 px-4 text-lg font-black text-slate-950 shadow-[0_0_34px_rgba(255,255,255,0.28)] outline-none transition placeholder:text-slate-500 focus:border-white focus:ring-4 focus:ring-white/35 disabled:cursor-not-allowed disabled:opacity-70 min-[420px]:text-xl sm:h-[72px] sm:px-6 sm:text-2xl"
          />
        </form>

        <div
          aria-live="polite"
          className="mt-3 min-h-6 text-center text-sm font-semibold text-white/85"
        >
          {message || (isStarted ? activeHint : idleHint)}
        </div>

        <div className="sticky top-16 z-10 -mx-4 mt-3 border-y border-white/15 bg-indigo-950/35 px-4 py-3 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 text-center sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4">
            <div className="min-w-0 rounded-2xl border border-white/20 bg-black/20 px-3 py-3 shadow-inner shadow-white/5 backdrop-blur-sm">
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-white/65">
                Time
              </div>
              <div className="font-mono text-2xl font-black leading-none tabular-nums drop-shadow min-[420px]:text-3xl sm:text-5xl">
                {minutes}:{seconds}
              </div>
            </div>
            <div className="hidden h-12 w-px bg-white/25 sm:block" />
            <div className="min-w-0 rounded-2xl border border-white/20 bg-black/20 px-3 py-3 shadow-inner shadow-white/5 backdrop-blur-sm">
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-white/65">
                Score
              </div>
              <div className="whitespace-nowrap font-mono text-2xl font-black leading-none tabular-nums text-[#06FFA5] drop-shadow min-[420px]:text-3xl sm:text-5xl">
                {gameState.score} / {targetScore}
              </div>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="mt-3 h-3 overflow-hidden rounded-full bg-black/25 shadow-inner"
          >
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#06FFA5_0%,#4ECDC4_52%,#FFE66D_100%)] shadow-[0_0_18px_rgba(6,255,165,0.55)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4 max-h-52 overflow-y-auto rounded-2xl border border-white/20 bg-black/20 p-3 shadow-inner shadow-black/20 backdrop-blur-sm sm:p-4">
          {gameState.guessedAnswers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {gameState.guessedAnswers.map((answer) => (
                <span
                  key={answer.name}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm font-black tracking-tight',
                    categoryStyles[answer.category] ?? categoryStyles.other
                  )}
                >
                  {answer.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="break-words text-sm font-medium text-white/75">
              {emptyTagsText}
            </p>
          )}
        </div>

        {gameState.isGameOver ? (
          <div className="mt-4 rounded-2xl border border-white/25 bg-white/12 p-4 shadow-xl shadow-indigo-950/20 backdrop-blur-md">
            <div className="flex items-center gap-2 text-lg font-black">
              <IconTrophy className="size-5 text-[#FFE66D]" />
              Final score: {gameState.score} / {targetScore}
            </div>
            <p className="mt-2 text-sm text-white/75">
              Nice run. Review a few names you missed, then start again and try
              to beat your score.
            </p>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-bold">
                Show missed answer examples
              </summary>
              <div className="mt-3 max-h-40 overflow-y-auto text-sm text-white/75">
                {missedAnswers.map((answer) => answer.name).join(', ')}
              </div>
            </details>
            <button
              type="button"
              onClick={resetGame}
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-indigo-950 shadow-lg shadow-indigo-950/20 transition hover:bg-white/90"
            >
              <IconRefresh className="size-4" />
              Play Again
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
