const RETIRED_TEMPLATE_PATHS = new Set([
  '/about',
  '/ai',
  '/roadmap',
  '/waitlist',
]);

export function getRetiredTemplateRedirect(requestUrl: string) {
  const url = new URL(requestUrl);
  if (!RETIRED_TEMPLATE_PATHS.has(url.pathname)) return null;
  return new URL('/', url).toString();
}
