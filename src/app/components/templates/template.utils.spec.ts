import { describe, expect, it } from 'vitest';

import {
  buildEmailPreviewDocument,
  countSmsSegments,
  extractVariablesFromContent,
  interpolateTemplate,
  TEMPLATE_PREVIEW_SAMPLE_VARS,
} from './template.utils';

describe('template.utils', () => {
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

  it('interpolates known variables', () => {
    expect(interpolateTemplate('Hi {{firstName}}', TEMPLATE_PREVIEW_SAMPLE_VARS)).toBe(
      'Hi Camille',
    );
  });

  it('builds a global email HTML document with injected body and CSS', () => {
    const doc = buildEmailPreviewDocument({
      subject: 'Hello {{firstName}}',
      htmlBody: '<main><p>Welcome {{firstName}}</p></main>',
      css: 'main { color: red; }',
      variables: TEMPLATE_PREVIEW_SAMPLE_VARS,
    });

    expect(doc).toContain('<style type="text/css">main { color: red; }</style>');
    expect(doc).toContain('<body>');
    expect(doc).toContain('<main><p>Welcome Camille</p></main>');
  });
});
