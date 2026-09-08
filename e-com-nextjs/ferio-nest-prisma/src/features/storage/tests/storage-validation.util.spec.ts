import { BadRequestException } from '@nestjs/common';
import { assertUploadContent } from '../storage-validation.util';

describe('assertUploadContent', () => {
  it('accepts a matching PNG signature', () => {
    expect(() =>
      assertUploadContent({
        mimetype: 'image/png',
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      }),
    ).not.toThrow();
  });

  it('rejects a spoofed MIME type', () => {
    expect(() =>
      assertUploadContent({
        mimetype: 'image/png',
        buffer: Buffer.from('not a png'),
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported content types', () => {
    expect(() =>
      assertUploadContent({
        mimetype: 'text/html',
        buffer: Buffer.from('<x>'),
      }),
    ).toThrow(BadRequestException);
  });
});
