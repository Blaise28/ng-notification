import type { TemplateChannel } from './template.models';

export interface TemplateStarter {
  id: string;
  label: string;
  description: string;
  channel: TemplateChannel;
  subject?: string;
  htmlBody?: string;
  css?: string;
  smsBody?: string;
}

export const TEMPLATE_STARTERS: TemplateStarter[] = [
  {
    id: 'welcome',
    label: 'Bienvenue',
    description: 'Message de bienvenue avec bouton CTA',
    channel: 'email',
    subject: 'Bienvenue {{displayName}} !',
    htmlBody: `<h1 style="margin:0 0 16px;font-size:24px;color:#0f172a;">Bienvenue {{firstName}} !</h1>
<p style="margin:0 0 16px;color:#334155;">Nous sommes ravis de vous compter parmi nos clients.</p>
<p style="margin:0 0 24px;color:#334155;">Votre compte est prêt. Connectez-vous pour découvrir nos services.</p>
<p style="margin:0;">
  <a href="#" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Accéder à mon espace</a>
</p>`,
    css: 'a:hover { opacity: 0.9; }',
  },
  {
    id: 'reminder',
    label: 'Rappel RDV',
    description: 'Rappel de rendez-vous avec détails',
    channel: 'email',
    subject: 'Rappel : votre rendez-vous',
    htmlBody: `<h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">Bonjour {{firstName}},</h2>
<p style="margin:0 0 16px;color:#334155;">Nous vous rappelons votre rendez-vous prochainement.</p>
<div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:0 0 16px;">
  <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Contact</p>
  <p style="margin:0;font-weight:600;color:#0f172a;">{{displayName}} — {{phone}}</p>
</div>
<p style="margin:0;color:#64748b;font-size:14px;">En cas d'empêchement, merci de nous prévenir.</p>`,
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    description: 'Annonce produit avec image',
    channel: 'email',
    subject: 'Nouveautés pour {{companyName}}',
    htmlBody: `<h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Nos dernières nouveautés</h2>
<p style="margin:0 0 16px;color:#334155;">Bonjour {{displayName}},</p>
<p style="margin:0 0 16px;color:#334155;">Découvrez ce qui change pour vous ce mois-ci.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
  <tr>
    <td style="padding:12px;background:#f8fafc;border-radius:8px;vertical-align:top;width:50%;">
      <strong style="color:#0f172a;">Fonctionnalité 1</strong>
      <p style="margin:8px 0 0;color:#64748b;font-size:14px;">Description courte de la nouveauté.</p>
    </td>
    <td style="width:16px;"></td>
    <td style="padding:12px;background:#f8fafc;border-radius:8px;vertical-align:top;width:50%;">
      <strong style="color:#0f172a;">Fonctionnalité 2</strong>
      <p style="margin:8px 0 0;color:#64748b;font-size:14px;">Description courte de la nouveauté.</p>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'plain',
    label: 'Minimal',
    description: 'Paragraphe simple',
    channel: 'email',
    subject: 'Message pour {{displayName}}',
    htmlBody: `<p style="margin:0;color:#334155;line-height:1.65;">Bonjour {{firstName}},</p>
<p style="margin:16px 0 0;color:#334155;line-height:1.65;">Votre message ici.</p>
<p style="margin:16px 0 0;color:#334155;">Cordialement,<br/>L'équipe</p>`,
  },
  {
    id: 'sms-short',
    label: 'SMS court',
    description: 'SMS avec variables (≤ 160 car.)',
    channel: 'sms',
    smsBody:
      'Bonjour {{firstName}}, votre rendez-vous est confirmé. Contact : {{phone}}. Merci, {{companyName}}.',
  },
];

export function getStartersForChannel(channel: TemplateChannel): TemplateStarter[] {
  return TEMPLATE_STARTERS.filter((starter) => starter.channel === channel);
}
