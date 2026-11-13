import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ApiException } from '../common/api-exception.js';

const maxSize = 10 * 1024 * 1024;

@Injectable()
export class DocumentsService {
  private get directory() {
    return process.env.DOCUMENT_STORAGE_DIR ?? join(process.cwd(), 'private-documents');
  }

  validate(file?: Express.Multer.File) {
    if (!file?.buffer?.length || file.size > maxSize) {
      throw new ApiException(400, 'INVALID_DOCUMENT', 'Attach one file up to 10 MB.');
    }
    const bytes = file.buffer;
    const mime = bytes.subarray(0, 5).toString() === '%PDF-' ? 'application/pdf'
      : bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ? 'image/jpeg'
      : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
      : null;
    if (!mime) throw new ApiException(400, 'INVALID_DOCUMENT', 'Use a PDF, JPG, or PNG file.');
    return mime;
  }

  async save(file: Express.Multer.File) {
    const mime = this.validate(file);
    const key = randomUUID();
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await writeFile(join(this.directory, key), file.buffer, { flag: 'wx', mode: 0o600 });
    return { documentKey: key, documentName: file.originalname.slice(0, 200), documentMime: mime, documentSize: file.size };
  }

  read(key: string) {
    return readFile(join(this.directory, key));
  }

  async remove(key: string) {
    await unlink(join(this.directory, key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
