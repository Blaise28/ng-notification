const VARIABLE_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

export const TEMPLATE_PREVIEW_SAMPLE_VARS: Record<string, string> = {
  displayName: 'Camille Dupont',
  firstName: 'Camille',
  lastName: 'Dupont',
  companyName: 'Acme SAS',
  phone: '+33612345678',
  email: 'camille.dupont@example.com',
};

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

export function interpolateTemplate(source: string, variables: Record<string, string>): string {
  return source.replace(VARIABLE_PATTERN, (match, token: string) => variables[token] ?? match);
}

export function buildEmailPreviewDocument(options: {
  subject: string;
  htmlBody: string;
  css?: string | null;
  variables?: Record<string, string>;
}): string {
  const vars = options.variables ?? TEMPLATE_PREVIEW_SAMPLE_VARS;
  const subject = interpolateTemplate(options.subject, vars);
  const innerHtml = interpolateTemplate(options.htmlBody, vars);
  const css = options.css?.trim();
  const styleBlock = css ? `<style type="text/css">${css}</style>` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject || 'Aperçu')}</title>
  ${styleBlock}
</head>
<body>
  ${innerHtml || '<p style="color:#94a3b8;">(contenu vide)</p>'}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
