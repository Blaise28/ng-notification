import { describe, expect, it } from 'vitest';

import { resolveDocumentViewerKind } from '@components/documents/document-file/utils/document-file.utils';

describe('PdfReaderComponent', () => {
  it('should expose supported viewer kinds for pdf documents', () => {
    expect(
      resolveDocumentViewerKind({
        id: '1',
        title: 'Doc',
        file_url: 'https://example.com/file.pdf',
        document_kind: 'pdf',
      }),
    ).toBe('pdf');
  });
});
