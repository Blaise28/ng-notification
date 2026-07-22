export interface AppBranding {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  supportEmail?: string | null;
  websiteUrl?: string | null;
}

export const DEFAULT_APP_BRANDING: AppBranding = {
  name: 'Nightbird',
  logoUrl: null,
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  supportEmail: null,
  websiteUrl: null,
};

export interface RenderEmailOptions {
  branding?: AppBranding;
  subject: string;
  innerHtml: string;
  previewText?: string;
  css?: string | null;
}

export function applyTemplateCss(innerHtml: string, css?: string | null): string {
  const trimmed = css?.trim();
  if (!trimmed) {
    return innerHtml;
  }
  return `<style type="text/css">${trimmed}</style>${innerHtml}`;
}

export function renderBrandedEmailHtml(options: RenderEmailOptions): string {
  const branding = options.branding ?? DEFAULT_APP_BRANDING;
  const primary = branding.primaryColor ?? '#2563eb';
  const secondary = branding.secondaryColor ?? '#1e40af';
  const logo = branding.logoUrl?.trim();
  const appName = escapeHtml(branding.name);
  const preview = escapeHtml(options.previewText ?? options.subject);
  const footerParts = [appName];
  if (branding.supportEmail) {
    footerParts.push(
      `<a href="mailto:${escapeHtml(branding.supportEmail)}" style="color:${primary};text-decoration:none;">${escapeHtml(branding.supportEmail)}</a>`,
    );
  }
  if (branding.websiteUrl) {
    footerParts.push(
      `<a href="${escapeHtml(branding.websiteUrl)}" style="color:${primary};text-decoration:none;">${escapeHtml(branding.websiteUrl)}</a>`,
    );
  }

  const logoBlock = logo
    ? `<img src="${escapeHtml(logo)}" alt="${appName}" width="120" style="display:block;max-width:120px;height:auto;margin:0 auto 16px;" />`
    : `<div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${appName}</div>`;

  const innerHtml = applyTemplateCss(options.innerHtml, options.css);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(options.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${preview}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg, ${primary} 0%, ${secondary} 100%);padding:28px 32px;text-align:center;">
              ${logoBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px;color:#0f172a;font-size:16px;line-height:1.65;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;text-align:center;font-size:12px;color:#64748b;line-height:1.6;">
              ${footerParts.join(' &middot; ')}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
