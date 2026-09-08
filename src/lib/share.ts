type SharePayload = {
  title: string;
  text: string;
  url: string;
};

export type ChallengeShareNavigator = {
  share?: (payload: SharePayload) => Promise<void>;
  clipboard?: {
    writeText: (text: string) => Promise<void>;
  };
};

type ShareChallengeOptions = {
  score: number;
  targetScore: number;
  durationSeconds?: number;
  challengeTitle?: string;
  subjectLabel?: string;
  resultMode?: 'auto' | 'invite' | 'score';
  href: string;
  shareNavigator: ChallengeShareNavigator;
  onMessage: (message: string) => void;
  preferNativeShare?: boolean;
  logger?: Pick<Console, 'info' | 'warn'>;
};

const MIN_BRAG_SCORE_RATIO = 0.1;

function shouldBragWithScore(score: number, targetScore: number) {
  return score >= Math.ceil(targetScore * MIN_BRAG_SCORE_RATIO);
}

function formatDuration(durationSeconds: number) {
  const minutes = Math.round(durationSeconds / 60);
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

function formatInvitationTitle(challengeTitle: string) {
  if (/^(the|today's)\b/i.test(challengeTitle)) return challengeTitle;
  return `the ${challengeTitle}`;
}

function getShareText({
  score,
  targetScore,
  durationSeconds,
  challengeTitle,
  subjectLabel,
  resultMode,
}: {
  score: number;
  targetScore: number;
  durationSeconds: number;
  challengeTitle: string;
  subjectLabel: string;
  resultMode: 'auto' | 'invite' | 'score';
}) {
  if (
    resultMode !== 'score' &&
    (resultMode === 'invite' || !shouldBragWithScore(score, targetScore))
  ) {
    return `Can you name ${targetScore} ${subjectLabel} in ${formatDuration(
      durationSeconds
    )}? Try ${formatInvitationTitle(challengeTitle)}:`;
  }

  return `I named ${score} of ${targetScore} in ${challengeTitle}. Can you beat me?`;
}

export async function shareChallenge({
  score,
  targetScore,
  durationSeconds = 720,
  challengeTitle = 'the Name 100 Challenge',
  subjectLabel = 'famous women',
  resultMode = 'auto',
  href,
  shareNavigator,
  onMessage,
  preferNativeShare = false,
  logger,
}: ShareChallengeOptions) {
  const text = getShareText({
    score,
    targetScore,
    durationSeconds,
    challengeTitle,
    subjectLabel,
    resultMode,
  });
  const payload = {
    title: 'Name 100 Challenge',
    text,
    url: href,
  };
  const copyText = `${text} ${href}`;
  let triedClipboard = false;

  logger?.info('[name100:share] start', {
    href,
    hasNativeShare: Boolean(shareNavigator.share),
    hasClipboard: Boolean(shareNavigator.clipboard?.writeText),
    preferNativeShare,
    score,
    targetScore,
  });

  async function copyLink() {
    triedClipboard = true;
    if (!shareNavigator.clipboard?.writeText) {
      logger?.warn('[name100:share] clipboard_unavailable');
      throw new Error('Clipboard is unavailable.');
    }
    await shareNavigator.clipboard.writeText(copyText);
    logger?.info('[name100:share] clipboard_success');
    onMessage('Challenge link copied.');
  }

  try {
    if (preferNativeShare && shareNavigator.share) {
      logger?.info('[name100:share] native_start');
      await shareNavigator.share(payload);
      logger?.info('[name100:share] native_success');
      return;
    }
    logger?.info('[name100:share] native_skipped', {
      reason: shareNavigator.share ? 'desktop_copy_first' : 'unavailable',
    });
    await copyLink();
  } catch (error) {
    const errorName = (error as DOMException).name;
    if (errorName === 'AbortError') {
      logger?.info('[name100:share] native_aborted');
      return;
    }

    logger?.warn('[name100:share] share_failed', {
      name: errorName || 'Error',
      message: error instanceof Error ? error.message : String(error),
      triedClipboard,
    });

    if (!triedClipboard) {
      try {
        await copyLink();
        return;
      } catch {
        // Fall through to the shared unavailable message.
      }
    }

    logger?.warn('[name100:share] unavailable');
    onMessage('Sharing is unavailable in this browser.');
  }
}

export function shouldPreferNativeShare({
  coarsePointer,
  maxTouchPoints,
  userAgent,
}: {
  coarsePointer?: boolean;
  maxTouchPoints?: number;
  userAgent?: string;
}) {
  const isMobileUserAgent = /Android|iPhone|iPad|iPod/i.test(userAgent ?? '');
  return Boolean(
    coarsePointer || isMobileUserAgent || (maxTouchPoints ?? 0) > 0
  );
}
