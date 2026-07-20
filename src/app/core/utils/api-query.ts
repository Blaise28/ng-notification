export function toQueryParams<T extends object>(
  query?: T,
): Record<string, string | number | boolean> | undefined {
  if (!query) {
    return undefined;
  }
  const params: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      params[key] = value;
    }
  }
  return params;
}
