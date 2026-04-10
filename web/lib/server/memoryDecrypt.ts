import { createDecipheriv, createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';

/** Keep in sync with mcp-server/src/crypto/memoryEncryption.ts */
const ALGO = 'aes-256-gcm';
const GCM_IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function deriveMemoryKeyFromSecret(secret: string): Buffer {
  const k = secret.trim();
  if (/^[0-9a-fA-F]{64}$/.test(k)) {
    return Buffer.from(k, 'hex');
  }
  return createHash('sha256').update(k, 'utf8').digest();
}

export function getMemoryEncryptionKey(): Buffer {
  const k = process.env.MEMORY_ENCRYPTION_KEY?.trim();
  if (!k) {
    throw new Error('MEMORY_ENCRYPTION_KEY is not set');
  }
  return deriveMemoryKeyFromSecret(k);
}

export function decryptMemoryContentWithKey(
  content_enc: Buffer,
  content_iv: Buffer,
  key: Buffer
): string {
  if (content_iv.length !== GCM_IV_LENGTH) {
    throw new Error(
      `Invalid IV length ${content_iv.length} (expected ${GCM_IV_LENGTH} bytes for AES-256-GCM)`
    );
  }
  if (content_enc.length < AUTH_TAG_LENGTH) {
    throw new Error('Invalid ciphertext: content_enc shorter than auth tag');
  }
  const tag = content_enc.subarray(content_enc.length - AUTH_TAG_LENGTH);
  const data = content_enc.subarray(0, content_enc.length - AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGO, key, content_iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch (err) {
    const isAuth =
      err instanceof Error &&
      (err.message.includes('authenticate') || err.message.includes('Unsupported state'));
    if (isAuth) {
      throw new Error(
        'AES-GCM authentication failed — wrong MEMORY_ENCRYPTION_KEY for this row or corrupt BYTEA.'
      );
    }
    throw err;
  }
}
