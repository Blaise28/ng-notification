import { describe, expect, it } from 'vitest';

import { renderBrandedEmailHtml } from './email-branding.utils';
import {
  buildEmailPreviewDocument,
  interpolateTemplate,
  TEMPLATE_PREVIEW_SAMPLE_VARS,
} from './template-preview.utils';
import { countSmsSegments, extractVariablesFromContent } from './template-variables.utils';

describe('template-variables.utils', () => {
  it('extracts variables from content', () => {
    expect(extractVariablesFromContent('Hello {{firstName}} {{lastName}}')).toEqual([
      'firstName',
      'lastName',
    ]);
  });

  it('counts SMS segments', () => {
    expect(countSmsSegments('')).toEqual({ length: 0, segments: 0 });
    expect(countSmsSegments('x'.repeat(160))).toEqual({ length: 160, segments: 1 });
    expect(countSmsSegments('x'.repeat(161))).toEqual({ length: 161, segments: 2 });
  });
});

describe('template-preview.utils', () => {
  it('interpolates known variables', () => {
    expect(interpolateTemplate('Hi {{firstName}}', TEMPLATE_PREVIEW_SAMPLE_VARS)).toBe(
      'Hi Camille',
    );
  });

  it('builds content-only preview document', () => {
    const doc = buildEmailPreviewDocument({
      subject: 'Hello {{firstName}}',
      htmlBody: '<p>Welcome {{firstName}}</p>',
      variables: TEMPLATE_PREVIEW_SAMPLE_VARS,
    });
    expect(doc).toContain('Camille');
    expect(doc).not.toContain('Nightbird');
  });

  it('builds branded preview document', () => {
    const doc = buildEmailPreviewDocument({
      subject: 'Hello',
      htmlBody: '<p>Welcome</p>',
      branded: true,
    });
    expect(doc).toContain('Nightbird');
  });
});

describe('email-branding.utils', () => {
  it('wraps inner html with branding layout', () => {
    const html = renderBrandedEmailHtml({
      subject: 'Test',
      innerHtml: '<p>Body</p>',
    });
    expect(html).toContain('Nightbird');
    expect(html).toContain('<p>Body</p>');
  });
});
