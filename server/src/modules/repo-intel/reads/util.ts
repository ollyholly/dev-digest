import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Read a file from a repo's clone, degrading to `null` on any failure. */
export async function readClone(clonePath: string, file: string): Promise<string | null> {
  return readFile(join(clonePath, file), 'utf8').catch(() => null);
}
