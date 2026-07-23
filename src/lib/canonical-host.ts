const CANONICAL_HOST = 'name100challenge.com';
const WWW_HOST = `www.${CANONICAL_HOST}`;

export function getCanonicalHostRedirect(url: string) {
  const parsedUrl = new URL(url);
  const isProductionHost =
    parsedUrl.hostname === CANONICAL_HOST || parsedUrl.hostname === WWW_HOST;

  if (!isProductionHost) return null;
  if (
    parsedUrl.protocol === 'https:' &&
    parsedUrl.hostname === CANONICAL_HOST
  ) {
    return null;
  }

  parsedUrl.protocol = 'https:';
  parsedUrl.hostname = CANONICAL_HOST;
  parsedUrl.port = '';
  return parsedUrl.toString();
}
