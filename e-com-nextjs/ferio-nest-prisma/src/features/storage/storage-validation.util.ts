import { BadRequestException } from '@nestjs/common';

type SupportedUpload = {
  buffer: Buffer;
  mimetype: string;
};

const signatures: Record<string, (buffer: Buffer) => boolean> = {
  'image/jpeg': (buffer) =>
    buffer.length >= 3 &&
    buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  'image/png': (buffer) =>
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (buffer) =>
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  'application/pdf': (buffer) =>
    buffer.subarray(0, 5).toString('ascii') === '%PDF-',
};

export function assertUploadContent(file: SupportedUpload): void {
  const signature = signatures[file.mimetype];
  if (!signature || !signature(file.buffer)) {
    throw new BadRequestException(
      'Uploaded content does not match the declared file type',
    );
  }
}
