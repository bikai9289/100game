'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  initGame,
  normalizeInput,
  remainingTimeFromDeadline,
  submitAnswer,
  type Answer,
  type GameState,
} from '@/lib/gameEngine';
import { cn } from '@/lib/utils';
import {
  IconMessage,
  IconRefresh,
  IconSend,
  IconShare,
  IconTrophy,
} from '@tabler/icons-react';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

type StoredGame = {
  guessedNames: string[];
  remainingTime: number;
  deadlineMs?: number;
  startedAt?: number;
  isGameOver: boolean;
  isStarted: boolean;
};

type LeaderboardEntry = {
  id: string;
  playerName: string;
  score: number;
  durationMs: number;
  createdAt: string;
};

type GameComment = {
  id: string;
  displayName: string;
  message: string;
  score: number | null;
  createdAt: string;
};

type CommunityData = {
  leaderboard: LeaderboardEntry[];
  comments: GameComment[];
};

type Name100GameProps = {
  answers: Answer[];
  targetScore?: number;
  durationSeconds?: number;
  gameId?: string;
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
  deadlineMs: number | null,
  startedAt: number | null,
  storageKey: string,
  storageCookie: string
) {
  const stored: StoredGame = {
    guessedNames: state.guessedAnswers.map((answer) => answer.name),
    remainingTime: state.remainingTime,
    deadlineMs: deadlineMs ?? undefined,
    startedAt: startedAt ?? undefined,
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
  answers,
  targetScore = 100,
  durationSeconds = 720,
  gameId = 'women',
  storageKey = 'name100:women:v2',
  storageCookie = 'name100_women_v2',
  ariaLabel = 'Name 100 Women game',
  placeholder = "Type a famous woman's name...",
  activeHint = 'Keep going. Think by category.',
  idleHint = 'Press Enter after each name. Your timer starts on the first guess.',
  missText = 'Not in the answer list yet. Try another famous person.',
}: Name100GameProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const deadlineRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const finishedAtRef = useRef<number | null>(null);
  const [gameState, setGameState] = useState<GameState>(() =>
    initGame(answers, { durationSeconds })
  );
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [hasRestoredGame, setHasRestoredGame] = useState(false);
  const [period, setPeriod] = useState<'daily' | 'all'>('daily');
  const [community, setCommunity] = useState<CommunityData>({
    leaderboard: [],
    comments: [],
  });
  const [communityStatus, setCommunityStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [playerName, setPlayerName] = useState('');
  const [commentMessage, setCommentMessage] = useState('');
  const [scoreSubmitStatus, setScoreSubmitStatus] = useState('');
  const [commentSubmitStatus, setCommentSubmitStatus] = useState('');
  const inputId = `name100-input-${storageKey}`;
  const playerNameId = `name100-player-${storageKey}`;
  const commentId = `name100-comment-${storageKey}`;
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

  const loadCommunity = useCallback(async () => {
    setCommunityStatus('loading');
    try {
      const response = await fetch(
        `/api/game/community?gameId=${encodeURIComponent(
          gameId
        )}&period=${period}`
      );
      const result = (await response.json()) as {
        ok: boolean;
        data?: CommunityData;
      };
      if (!response.ok || !result.ok || !result.data) throw new Error();
      setCommunity(result.data);
      setCommunityStatus('ready');
    } catch {
      setCommunityStatus('error');
    }
  }, [gameId, period]);

  useEffect(() => {
    void loadCommunity();
  }, [loadCommunity]);

  useEffect(() => {
    inputRef.current?.focus();
    try {
      setPlayerName(window.localStorage.getItem('name100:player-name') ?? '');
    } catch {
      // The name can still be entered without storage.
    }
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
      const deadlineMs =
        parsed.deadlineMs ?? Date.now() + parsed.remainingTime * 1000;
      const remainingTime = parsed.isStarted
        ? remainingTimeFromDeadline(deadlineMs)
        : durationSeconds;
      const isGameOver = parsed.isGameOver || remainingTime === 0;

      deadlineRef.current = deadlineMs;
      startedAtRef.current =
        parsed.startedAt ?? deadlineMs - durationSeconds * 1000;
      if (isGameOver) finishedAtRef.current = Math.min(Date.now(), deadlineMs);
      setGameState({
        ...initGame(answers, { durationSeconds }),
        score: guessedAnswers.length,
        guessedAnswers,
        remainingTime,
        isGameOver,
      });
      setIsStarted(parsed.isStarted && !isGameOver);
    } catch {
      clearStoredGame(storageKey, storageCookie);
    } finally {
      setHasRestoredGame(true);
    }
  }, [answers, durationSeconds, storageCookie, storageKey]);

  useEffect(() => {
    if (!hasRestoredGame) return;

    persistGame(
      gameState,
      isStarted,
      deadlineRef.current,
      startedAtRef.current,
      storageKey,
      storageCookie
    );
  }, [gameState, hasRestoredGame, isStarted, storageCookie, storageKey]);

  useEffect(() => {
    if (!isStarted || gameState.isGameOver || !deadlineRef.current) return;

    const interval = window.setInterval(() => {
      setGameState((current) => {
        const remainingTime = remainingTimeFromDeadline(
          deadlineRef.current ?? Date.now()
        );
        if (remainingTime === 0) {
          finishedAtRef.current = Date.now();
          return { ...current, remainingTime, isGameOver: true };
        }

        return { ...current, remainingTime };
      });
    }, 500);

    return () => window.clearInterval(interval);
  }, [gameState.isGameOver, isStarted]);

  const minutes = Math.floor(gameState.remainingTime / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (gameState.remainingTime % 60).toString().padStart(2, '0');
  const progress = Math.min(100, (gameState.score / targetScore) * 100);
  const answerSlots = Array.from(
    { length: targetScore },
    (_, index) => gameState.guessedAnswers[index] ?? null
  );

  function submitGuess(value: string) {
    if (gameState.isGameOver) return;

    const guess = value.trim();
    if (!guess) {
      setMessage('Type a name to make a guess.');
      return;
    }

    if (!isStarted) {
      const now = Date.now();
      startedAtRef.current = now;
      deadlineRef.current = now + durationSeconds * 1000;
      setIsStarted(true);
    }
    const result = submitAnswer(guess, gameState, answers, { targetScore });
    const nextState =
      result.newState.score >= targetScore
        ? { ...result.newState, isGameOver: true }
        : result.newState;
    if (nextState.isGameOver) finishedAtRef.current = Date.now();

    if (result.isDuplicate) {
      setMessage('Already guessed!');
    } else if (result.isCorrect) {
      setMessage(`${result.newState.guessedAnswers.at(-1)?.name} counts.`);
      setInput('');
    } else {
      setMessage(missText);
    }

    setGameState(nextState);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitGuess(input);
  }

  function resetGame() {
    const nextState = initGame(answers, { durationSeconds });
    deadlineRef.current = null;
    startedAtRef.current = null;
    finishedAtRef.current = null;
    setGameState(nextState);
    setInput('');
    setMessage('');
    setScoreSubmitStatus('');
    setIsStarted(false);
    clearStoredGame(storageKey, storageCookie);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function shareGame() {
    const text = `I named ${gameState.score} of ${targetScore} in the Name 100 Challenge. Can you beat me?`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Name 100 Challenge',
          text,
          url: location.href,
        });
      } else {
        await navigator.clipboard.writeText(`${text} ${location.href}`);
        setMessage('Challenge link copied.');
      }
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        setMessage('Sharing is unavailable in this browser.');
      }
    }
  }

  async function submitScore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = playerName.trim();
    if (cleanName.length < 2) {
      setScoreSubmitStatus('Enter a name with at least 2 characters.');
      return;
    }

    setScoreSubmitStatus('Saving...');
    try {
      const response = await fetch('/api/game/community', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'score',
          gameId,
          playerName: cleanName,
          guessedNames: gameState.guessedAnswers.map((answer) => answer.name),
          startedAt:
            startedAtRef.current ?? Date.now() - durationSeconds * 1000,
          finishedAt: finishedAtRef.current ?? Date.now(),
          durationSeconds,
        }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        error?: { message?: string };
      };
      if (!response.ok || !result.ok) {
        throw new Error(result.error?.message ?? 'Score could not be saved.');
      }
      try {
        window.localStorage.setItem('name100:player-name', cleanName);
      } catch {
        // Saving the score does not depend on local storage.
      }
      setScoreSubmitStatus('Score saved to the leaderboard.');
      await loadCommunity();
    } catch (error) {
      setScoreSubmitStatus(
        error instanceof Error ? error.message : 'Score could not be saved.'
      );
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCommentSubmitStatus('Posting...');
    try {
      const response = await fetch('/api/game/community', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          gameId,
          displayName: playerName.trim(),
          message: commentMessage,
        }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        error?: { message?: string };
      };
      if (!response.ok || !result.ok) {
        throw new Error(
          result.error?.message ?? 'Comment could not be posted.'
        );
      }
      setCommentMessage('');
      setCommentSubmitStatus('Comment posted.');
      await loadCommunity();
    } catch (error) {
      setCommentSubmitStatus(
        error instanceof Error ? error.message : 'Comment could not be posted.'
      );
    }
  }

  return (
    <section
      aria-label={ariaLabel}
      className="mx-auto grid w-full max-w-[1180px] gap-[22px] lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start"
    >
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <div className="sticky top-[64px] z-20 grid gap-3 bg-background/95 py-3 backdrop-blur-md">
          <div className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2">
            <div className="text-center">
              <div className="text-[0.625rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Time
              </div>
              <div className="font-mono text-2xl font-extrabold tabular-nums text-foreground">
                {minutes}:{seconds}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[0.625rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Score
              </div>
              <div className="font-mono text-2xl font-extrabold tabular-nums text-primary">
                {gameState.score} / {targetScore}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={resetGame}
              aria-label="Restart game"
              title="Restart game"
            >
              <IconRefresh />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void shareGame()}
              aria-label="Share challenge"
              title="Share challenge"
            >
              <IconShare />
            </Button>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor={inputId} className="sr-only">
              Type a famous person's name
            </label>
            <Input
              ref={inputRef}
              id={inputId}
              name="answer"
              value={input}
              disabled={gameState.isGameOver}
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              placeholder={placeholder}
              onChange={(event) => setInput(event.target.value)}
              className="h-[46px] w-full rounded-lg border-2 border-input bg-card px-3.5 text-center text-[0.9375rem] font-medium text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </form>

          <Progress
            value={progress}
            aria-label="Game progress"
            className="gap-0 [&_[data-slot=progress-indicator]]:bg-primary [&_[data-slot=progress-track]]:h-2"
          />
        </div>

        {message ? (
          <div
            aria-live="polite"
            className="mt-1 text-center text-sm font-semibold text-muted-foreground"
          >
            {message}
          </div>
        ) : (
          <span className="sr-only" aria-live="polite">
            {isStarted ? activeHint : idleHint}
          </span>
        )}
      </div>

      <Card className="rounded-lg border border-border px-4 py-4 shadow-sm ring-0 lg:sticky lg:top-[76px] lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <CardHeader className="items-center px-0">
          <CardTitle className="flex items-center gap-2 text-[0.9375rem] font-extrabold">
            <IconTrophy className="size-5 text-amber-600" />
            Leaderboard
          </CardTitle>
          <div className="grid w-full grid-cols-2 rounded-lg bg-muted p-1">
            {(['daily', 'all'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={cn(
                  'h-8 rounded-md text-xs font-bold transition-colors',
                  period === value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {value === 'daily' ? 'Today' : 'All time'}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {communityStatus === 'loading' ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading scores...
            </p>
          ) : null}
          {communityStatus === 'error' ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Scores are temporarily unavailable.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void loadCommunity()}
              >
                Retry
              </Button>
            </div>
          ) : null}
          {communityStatus === 'ready' && community.leaderboard.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No scores yet. Finish a round to take the first spot.
            </p>
          ) : null}
          {community.leaderboard.map((row, index) => (
            <div
              key={row.id}
              className="grid grid-cols-[30px_1fr_auto] items-center gap-2 border-b border-border px-1.5 py-2 text-[0.8125rem] last:border-b-0"
            >
              <span
                className={cn(
                  'font-bold text-muted-foreground',
                  index === 0 && 'text-amber-600'
                )}
              >
                #{index + 1}
              </span>
              <span className="min-w-0 truncate font-semibold text-foreground">
                {row.playerName}
              </span>
              <span className="font-black text-primary">{row.score}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-[7px] min-[380px]:grid-cols-2 md:grid-cols-3 lg:col-start-1 lg:grid-cols-4">
        {answerSlots.map((answer, index) => (
          <div
            key={`${answer?.name ?? 'empty'}-${index}`}
            className={cn(
              'flex min-h-[38px] items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 transition duration-150',
              answer &&
                cn(
                  'animate-in zoom-in-95 fade-in',
                  categoryStyles[answer.category] ?? categoryStyles.other
                )
            )}
          >
            <span
              className={cn(
                'w-5 shrink-0 text-right text-[0.6875rem] text-muted-foreground',
                answer && 'text-white/75'
              )}
            >
              {index + 1}
            </span>
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-[0.8125rem]',
                answer ? 'font-semibold text-white' : 'text-muted-foreground'
              )}
            >
              {answer?.name ?? '-'}
            </span>
          </div>
        ))}
      </div>

      {gameState.isGameOver ? (
        <Card className="rounded-lg border border-border py-4 shadow-sm ring-0 lg:col-start-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-black">
              <IconTrophy className="size-5 text-primary" />
              Final score: {gameState.score} / {targetScore}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => void submitScore(event)}
              className="grid gap-3 sm:grid-cols-[1fr_auto]"
            >
              <div>
                <label htmlFor={playerNameId} className="sr-only">
                  Leaderboard name
                </label>
                <Input
                  id={playerNameId}
                  value={playerName}
                  maxLength={24}
                  placeholder="Leaderboard name"
                  onChange={(event) => setPlayerName(event.target.value)}
                />
              </div>
              <Button type="submit" className="font-bold">
                <IconSend data-icon="inline-start" />
                Save score
              </Button>
            </form>
            <p
              className="mt-2 min-h-5 text-sm text-muted-foreground"
              aria-live="polite"
            >
              {scoreSubmitStatus}
            </p>
            <details className="mt-2 rounded-lg border border-border bg-background p-4">
              <summary className="cursor-pointer text-sm font-bold">
                Show missed answer examples
              </summary>
              <div className="mt-3 max-h-40 overflow-y-auto text-sm text-muted-foreground">
                {missedAnswers.map((answer) => answer.name).join(', ')}
              </div>
            </details>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={resetGame} className="font-bold">
                <IconRefresh data-icon="inline-start" />
                Play again
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void shareGame()}
                className="font-bold"
              >
                <IconShare data-icon="inline-start" />
                Share score
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="border-t border-border pt-8 lg:col-span-2">
        <div className="grid gap-8 lg:grid-cols-[minmax(280px,0.8fr)_1.2fr]">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <IconMessage className="size-5 text-primary" />
              Player notes
            </h2>
            <form
              onSubmit={(event) => void submitComment(event)}
              className="mt-4 grid gap-3"
            >
              <label htmlFor={`${playerNameId}-comment`} className="sr-only">
                Display name
              </label>
              <Input
                id={`${playerNameId}-comment`}
                value={playerName}
                maxLength={24}
                placeholder="Display name"
                onChange={(event) => setPlayerName(event.target.value)}
              />
              <label htmlFor={commentId} className="sr-only">
                Comment
              </label>
              <Textarea
                id={commentId}
                value={commentMessage}
                maxLength={280}
                placeholder="Leave a short note about your run"
                onChange={(event) => setCommentMessage(event.target.value)}
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {commentMessage.length}/280
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!commentMessage.trim()}
                >
                  <IconSend data-icon="inline-start" />
                  Post
                </Button>
              </div>
              <p
                className="min-h-5 text-sm text-muted-foreground"
                aria-live="polite"
              >
                {commentSubmitStatus}
              </p>
            </form>
          </div>

          <div className="divide-y divide-border">
            {communityStatus === 'ready' && community.comments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No notes yet.
              </p>
            ) : null}
            {community.comments.map((comment) => (
              <article key={comment.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold text-foreground">
                    {comment.displayName}
                    {comment.score !== null ? (
                      <span className="ml-2 text-xs font-semibold text-primary">
                        Score {comment.score}
                      </span>
                    ) : null}
                  </p>
                  <time className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </time>
                </div>
                <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                  {comment.message}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
