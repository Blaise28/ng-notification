export const TEMPLATE_PREVIEW_SAMPLE_VARS: Record<string, string> = {
  displayName: 'Camille Dupont',
  firstName: 'Camille',
  lastName: 'Dupont',
  companyName: 'Acme SAS',
  phone: '+33612345678',
  email: 'camille.dupont@example.com',
};

export function interpolateTemplate(source: string, variables: Record<string, string>): string {
  return source.replace(
    /\{\{\s*(\w+)\s*\}\}/g,
    (match, token: string) => variables[token] ?? match,
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Preview document = template HTML + CSS only (no app branding wrapper). */
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
<body style="margin:0;padding:16px;">
  ${innerHtml || '<p style="color:#94a3b8;">(contenu vide)</p>'}
</body>
</html>`;
}
