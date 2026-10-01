/** Only the app's own consent route can be used as a post-login destination. */
export function consentReturnPath(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname !== "/.lovable/oauth/consent" || !url.searchParams.get("authorization_id")) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

export function consentNext(search: string): string | null {
  return consentReturnPath(new URLSearchParams(search).get("next"));
}