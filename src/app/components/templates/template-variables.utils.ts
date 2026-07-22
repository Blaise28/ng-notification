const VARIABLE_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

export function extractVariablesFromContent(...texts: (string | null | undefined)[]): string[] {
  const keys = new Set<string>();
  for (const text of texts) {
    if (!text) {
      continue;
    }
    for (const match of text.matchAll(VARIABLE_PATTERN)) {
      if (match[1]) {
        keys.add(match[1]);
      }
    }
  }
  return [...keys];
}

export function countSmsSegments(body: string): { length: number; segments: number } {
  const length = body.length;
  const singleLimit = 160;
  const multiLimit = 153;
  if (length <= singleLimit) {
    return { length, segments: length === 0 ? 0 : 1 };
  }
  return { length, segments: Math.ceil(length / multiLimit) };
}
