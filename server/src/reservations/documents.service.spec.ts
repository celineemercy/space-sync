import { describe, expect, it } from 'vitest';
import { DocumentsService } from './documents.service.js';

describe('permission document validation', () => {
  const service = new DocumentsService();
  it('accepts PDF, JPEG and PNG signatures', () => {
    for (const [buffer, mime] of [
      [Buffer.from('%PDF-1.7'), 'application/pdf'],
      [Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'image/jpeg'],
      [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png'],
    ] as const) {
      expect(service.validate({ buffer, size: buffer.length } as Express.Multer.File)).toBe(mime);
    }
  });
  it('rejects missing, oversized and unsupported content', () => {
    expect(() => service.validate()).toThrow();
    expect(() => service.validate({ buffer: Buffer.from('%PDF-'), size: 10 * 1024 * 1024 + 1 } as Express.Multer.File)).toThrow();
    expect(() => service.validate({ buffer: Buffer.from('hello'), size: 5 } as Express.Multer.File)).toThrow();
  });
});
