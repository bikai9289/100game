export interface Answer {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  hint?: string;
}

export interface GameState {
  score: number;
  totalAnswers: number;
  guessedAnswers: Answer[];
  remainingTime: number;
  isGameOver: boolean;
}

export function normalizeInput(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fuzzyMatch(input: string, target: string): boolean {
  const normalizedInput = normalizeInput(input);
  const normalizedTarget = normalizeInput(target);

  if (!normalizedInput || !normalizedTarget) {
    return false;
  }

  if (normalizedInput === normalizedTarget) {
    return true;
  }

  if (
    Math.min(normalizedInput.length, normalizedTarget.length) < 5 ||
    Math.abs(normalizedInput.length - normalizedTarget.length) > 1
  ) {
    return false;
  }

  return levenshteinDistance(normalizedInput, normalizedTarget) <= 1;
}

export function checkAnswer(input: string, answers: Answer[]): Answer | null {
  const normalized = normalizeInput(input);

  if (!normalized) {
    return null;
  }

  const exactMatches = answers.filter((answer) =>
    [answer.name, ...answer.aliases].some(
      (alias) => normalizeInput(alias) === normalized
    )
  );

  if (exactMatches.length > 0) {
    return exactMatches.length === 1 ? exactMatches[0] : null;
  }

  const fuzzyMatches = answers.filter((answer) =>
    [answer.name, ...answer.aliases].some((alias) =>
      fuzzyMatch(normalized, alias)
    )
  );

  return fuzzyMatches.length === 1 ? fuzzyMatches[0] : null;
}

export function remainingTimeFromDeadline(
  deadlineMs: number,
  nowMs = Date.now()
): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

export function initGame(
  answers: Answer[],
  options: { durationSeconds?: number } = {}
): GameState {
  return {
    score: 0,
    totalAnswers: answers.length,
    guessedAnswers: [],
    remainingTime: options.durationSeconds ?? 720,
    isGameOver: false,
  };
}

export function submitAnswer(
  input: string,
  state: GameState,
  allAnswers: Answer[],
  options: { targetScore?: number } = {}
): { newState: GameState; isCorrect: boolean; isDuplicate: boolean } {
  if (state.isGameOver) {
    return { newState: state, isCorrect: false, isDuplicate: false };
  }

  const match = checkAnswer(input, allAnswers);

  if (!match) {
    return { newState: state, isCorrect: false, isDuplicate: false };
  }

  const isDuplicate = state.guessedAnswers.some(
    (answer) => answer.id === match.id
  );

  if (isDuplicate) {
    return { newState: state, isCorrect: false, isDuplicate: true };
  }

  const guessedAnswers = [...state.guessedAnswers, match];
  const isGameOver =
    guessedAnswers.length >= (options.targetScore ?? 100) ||
    state.remainingTime <= 0;

  return {
    newState: {
      ...state,
      score: guessedAnswers.length,
      guessedAnswers,
      isGameOver,
    },
    isCorrect: true,
    isDuplicate: false,
  };
}

function levenshteinDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];

    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + substitutionCost
      );
    }

    previous = current;
  }

  return previous[b.length] ?? 0;
}
