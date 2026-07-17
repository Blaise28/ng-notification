/**
 * Normalise un `redirectUrl` de query string en chemin interne sûr (même origine, relatif).
 */
export function safeInternalRedirectPath(redirect: string | null | undefined): string {
  const defaultPath = '/';
  if (redirect == null || typeof redirect !== 'string') {
    return defaultPath;
  }
  let decoded = redirect.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    /* garder la chaîne brute */
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//')) {
    return defaultPath;
  }
  if (decoded.includes('://')) {
    return defaultPath;
  }
  return decoded;
}
