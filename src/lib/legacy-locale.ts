export function getLegacyLocaleRedirect(requestUrl: string): string | null {
  const url = new URL(requestUrl);

  if (url.pathname !== '/zh' && !url.pathname.startsWith('/zh/')) {
    return null;
  }

  url.pathname = url.pathname.slice(3) || '/';
  return url.toString();
}
