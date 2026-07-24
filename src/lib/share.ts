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
  href: string;
  shareNavigator: ChallengeShareNavigator;
  onMessage: (message: string) => void;
  preferNativeShare?: boolean;
  logger?: Pick<Console, 'info' | 'warn'>;
};

export async function shareChallenge({
  score,
  targetScore,
  href,
  shareNavigator,
  onMessage,
  preferNativeShare = false,
  logger,
}: ShareChallengeOptions) {
  const text = `I named ${score} of ${targetScore} in the Name 100 Challenge. Can you beat me?`;
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
