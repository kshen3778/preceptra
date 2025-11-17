/**
 * Local KV Storage
 *
 * File-based key-value storage for local development.
 * Storage location: .kv-storage/ (gitignored)
 */

import fs from 'fs/promises';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.kv-storage');

/**
 * Ensure storage directory exists
 */
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists, ignore
  }
}

/**
 * Convert key to safe filename
 */
function keyToFilename(key: string): string {
  return key.replace(/\//g, '__SLASH__').replace(/\./g, '__DOT__');
}

/**
 * Get value by key
 */
export async function get(key: string): Promise<string | null> {
  await ensureStorageDir();

  try {
    const filename = keyToFilename(key);
    const filepath = path.join(STORAGE_DIR, filename);
    const data = await fs.readFile(filepath, 'utf-8');
    return data;
  } catch (error) {
    // Key doesn't exist
    return null;
  }
}

/**
 * Set value by key
 */
export async function set(key: string, value: string): Promise<void> {
  await ensureStorageDir();

  const filename = keyToFilename(key);
  const filepath = path.join(STORAGE_DIR, filename);
  await fs.writeFile(filepath, value, 'utf-8');
}

/**
 * Get all keys matching a pattern
 * Note: This is a simplified version - only supports trailing wildcards
 */
export async function keys(pattern: string): Promise<string[]> {
  await ensureStorageDir();

  try {
    const files = await fs.readdir(STORAGE_DIR);

    // Convert pattern to prefix (remove trailing *)
    const prefix = pattern.replace(/\*/g, '');
    const prefixFilename = keyToFilename(prefix);

    // Filter files that match the prefix
    const matchingKeys = files
      .filter(file => file.startsWith(prefixFilename))
      .map(file => {
        // Convert filename back to key
        return file.replace(/__SLASH__/g, '/').replace(/__DOT__/g, '.');
      });

    return matchingKeys;
  } catch (error) {
    return [];
  }
}

/**
 * Delete a key
 */
export async function del(key: string): Promise<void> {
  await ensureStorageDir();

  try {
    const filename = keyToFilename(key);
    const filepath = path.join(STORAGE_DIR, filename);
    await fs.unlink(filepath);
  } catch (error) {
    // Key doesn't exist, ignore
  }
}

/**
 * Local KV storage interface
 */
export const mockKv = {
  get,
  set,
  keys,
  del,
};
