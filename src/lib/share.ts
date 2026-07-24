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
};

export async function shareChallenge({
  score,
  targetScore,
  href,
  shareNavigator,
  onMessage,
}: ShareChallengeOptions) {
  const text = `I named ${score} of ${targetScore} in the Name 100 Challenge. Can you beat me?`;
  const payload = {
    title: 'Name 100 Challenge',
    text,
    url: href,
  };
  const copyText = `${text} ${href}`;
  let triedClipboard = false;

  async function copyLink() {
    triedClipboard = true;
    if (!shareNavigator.clipboard?.writeText) {
      throw new Error('Clipboard is unavailable.');
    }
    await shareNavigator.clipboard.writeText(copyText);
    onMessage('Challenge link copied.');
  }

  try {
    if (shareNavigator.share) {
      await shareNavigator.share(payload);
      return;
    }
    await copyLink();
  } catch (error) {
    if ((error as DOMException).name === 'AbortError') return;

    if (!triedClipboard) {
      try {
        await copyLink();
        return;
      } catch {
        // Fall through to the shared unavailable message.
      }
    }

    onMessage('Sharing is unavailable in this browser.');
  }
}
