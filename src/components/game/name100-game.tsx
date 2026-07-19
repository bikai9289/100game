'use client';

import defaultAnswersData from '@/data/answers-women.json';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
  actresses: 'border-transparent bg-[#e11d78] text-white',
  musicians: 'border-transparent bg-[#7c3aed] text-white',
  athletes: 'border-transparent bg-[#059669] text-white',
  scientists: 'border-transparent bg-[#0284c7] text-white',
  politicians: 'border-transparent bg-[#d97706] text-white',
  historical: 'border-transparent bg-[#c026d3] text-white',
  business: 'border-transparent bg-[#0891b2] text-white',
  activists: 'border-transparent bg-[#65a30d] text-white',
  other: 'border-transparent bg-[#64748b] text-white',
};

const leaderboardNames = ['Emma', 'Sofia', 'Mia', 'Ava', 'Lily', 'Noa', 'Zoe'];

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

function getLeaderboardRows(score: number, targetScore: number) {
  const suggestedScores = [
    targetScore,
    targetScore - 2,
    targetScore - 3,
    targetScore - 5,
    targetScore - 7,
    targetScore - 29,
    targetScore - 30,
  ].map((item) => Math.max(0, item));

  return [
    ...leaderboardNames.map((name, index) => ({
      name,
      score: suggestedScores[index] ?? 0,
      isCurrentPlayer: false,
    })),
    { name: 'You', score, isCurrentPlayer: true },
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

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
  const answerSlots = Array.from({ length: targetScore }, (_, index) => {
    return gameState.guessedAnswers[index] ?? null;
  });
  const leaderboardRows = getLeaderboardRows(gameState.score, targetScore);

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
      className="mx-auto grid w-full max-w-[1180px] gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start"
    >
      <div className="min-w-0">
        <div className="sticky top-[72px] z-20 grid gap-3 bg-background/95 py-3 backdrop-blur-md sm:grid-cols-[1fr_minmax(240px,1.5fr)_1fr] sm:items-center">
          <div className="grid grid-cols-2 gap-3 sm:contents">
            <div className="text-center">
              <div className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Time
              </div>
              <div className="font-mono text-2xl font-black tabular-nums text-foreground sm:text-3xl">
                {minutes}:{seconds}
              </div>
            </div>

            <div className="text-center sm:order-3">
              <div className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Score
              </div>
              <div className="font-mono text-2xl font-black tabular-nums text-primary sm:text-3xl">
                {gameState.score} / {targetScore}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="sm:order-2">
            <label htmlFor={`name100-input-${storageKey}`} className="sr-only">
              Type a famous person's name
            </label>
            <Input
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
              className="h-12 w-full rounded-xl border-2 border-input bg-card px-4 text-center text-base font-semibold text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </form>

          <Progress
            value={progress}
            aria-label="Game progress"
            className="sm:order-4 sm:col-span-3 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-primary [&_[data-slot=progress-indicator]]:to-purple-400 [&_[data-slot=progress-track]]:h-2"
          />
        </div>

        <div
          aria-live="polite"
          className="min-h-6 text-center text-sm font-semibold text-muted-foreground"
        >
          {message || (isStarted ? activeHint : idleHint)}
        </div>

        <div className="mt-4 grid max-h-[560px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:max-h-none lg:overflow-visible lg:pr-0">
          {answerSlots.map((answer, index) => (
            <div
              key={`${answer?.name ?? 'empty'}-${index}`}
              className={cn(
                'flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2',
                answer &&
                  (categoryStyles[answer.category] ?? categoryStyles.other)
              )}
            >
              <span
                className={cn(
                  'w-7 shrink-0 text-right text-xs font-semibold text-muted-foreground',
                  answer && 'text-white/75'
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-sm',
                  answer ? 'font-bold text-white' : 'text-muted-foreground'
                )}
              >
                {answer?.name ?? '-'}
              </span>
            </div>
          ))}
        </div>

        {gameState.isGameOver ? (
          <Card className="mt-5 rounded-2xl shadow-[0_10px_40px_-16px_rgba(124,58,237,0.16)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <IconTrophy className="size-5 text-primary" />
                Final score: {gameState.score} / {targetScore}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Nice run. Review a few names you missed, then start again and
                try to beat your score.
              </p>
              <details className="mt-3 rounded-xl border border-border bg-background p-4">
                <summary className="cursor-pointer text-sm font-bold">
                  Show missed answer examples
                </summary>
                <div className="mt-3 max-h-40 overflow-y-auto text-sm text-muted-foreground">
                  {missedAnswers.map((answer) => answer.name).join(', ')}
                </div>
              </details>
              <Button
                type="button"
                onClick={resetGame}
                size="lg"
                className="mt-4 font-black"
              >
                <IconRefresh data-icon="inline-start" />
                Play Again
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="rounded-2xl shadow-[0_10px_40px_-16px_rgba(124,58,237,0.16)] lg:sticky lg:top-24">
        <CardHeader className="items-center">
          <CardTitle className="flex items-center gap-2 text-base font-black">
            <IconTrophy className="size-5 text-amber-600" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboardRows.map((row, index) => (
            <div
              key={row.name}
              className={cn(
                'grid grid-cols-[2rem_1fr_auto] items-center gap-2 border-b border-border px-2 py-2.5 text-sm last:border-b-0',
                row.isCurrentPlayer &&
                  'my-1 rounded-lg border-b-0 bg-accent px-3'
              )}
            >
              <span
                className={cn(
                  'font-bold text-muted-foreground',
                  index === 0 && 'text-amber-600'
                )}
              >
                #{index + 1}
              </span>
              <span className="font-semibold text-foreground">{row.name}</span>
              <span className="font-black text-primary">{row.score}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
