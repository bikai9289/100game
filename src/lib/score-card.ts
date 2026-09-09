type ScoreCard = {
  score: number;
  targetScore: number;
  elapsedSeconds: number;
  title: string;
  date?: string;
  categories: string[];
  url: string;
};

// Local canvas only: no uploaded scores, remote fonts or cross-origin images.
export function saveScoreCard(result: ScoreCard) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#fff7fb';
  ctx.fillRect(0, 0, 1200, 720);
  ctx.fillStyle = '#e11d78';
  ctx.fillRect(0, 0, 1200, 16);
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('Name100Challenge', 64, 90);
  ctx.fillStyle = '#242132';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText(result.title, 64, 175, 1072);
  ctx.font = 'bold 112px sans-serif';
  ctx.fillText(`${result.score} / ${result.targetScore}`, 64, 315);
  const minutes = Math.floor(result.elapsedSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (result.elapsedSeconds % 60).toString().padStart(2, '0');
  ctx.font = '32px sans-serif';
  ctx.fillText(`Time used: ${minutes}:${seconds}`, 64, 395);
  ctx.fillText(
    result.date ? `Daily challenge: ${result.date}` : 'Your challenge result',
    64,
    455
  );
  ctx.font = '26px sans-serif';
  ctx.fillText(result.categories.join(' / '), 64, 520, 1072);
  ctx.fillStyle = '#e11d78';
  ctx.fillText(result.url, 64, 640, 1072);
  const link = document.createElement('a');
  link.download = `name100-${result.date ?? 'score'}-${result.score}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.append(link);
  link.click();
  link.remove();
}
