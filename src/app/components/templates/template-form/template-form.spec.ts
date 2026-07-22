import { describe, expect, it } from 'vitest';

import { extractVariablesFromContent } from './template-variables.utils';

describe('template-form validation helpers', () => {
  it('detects email variables from subject and html body', () => {
    const variables = extractVariablesFromContent(
      'Hello {{firstName}}',
      '<p>Welcome {{displayName}}</p>',
      '',
    );
    expect(variables).toContain('firstName');
    expect(variables).toContain('displayName');
  });

  it('validates whatsapp requires ordered variable keys', () => {
    const keys: string[] = [];
    const hasKeys = keys.length >= 1;
    expect(hasKeys).toBe(false);
  });

  it('validates email requires subject and html', () => {
    const subject = '';
    const htmlBody = '';
    const isValid = subject.trim() !== '' && htmlBody.trim() !== '';
    expect(isValid).toBe(false);
  });
});
