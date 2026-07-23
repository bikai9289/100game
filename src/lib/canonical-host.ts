const CANONICAL_HOST = 'name100challenge.com';
const WWW_HOST = `www.${CANONICAL_HOST}`;

export function getCanonicalHostRedirect(url: string) {
  const parsedUrl = new URL(url);

  if (parsedUrl.hostname !== WWW_HOST) return null;

  parsedUrl.hostname = CANONICAL_HOST;
  return parsedUrl.toString();
}
