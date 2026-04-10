import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
export const GCM_IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte AES key from the same rules as MEMORY_ENCRYPTION_KEY env:
 * - 64-char hex → raw 32 bytes
 * - otherwise → SHA-256(utf8 string) — dev convenience; production prefer hex or Vault-held key
 */
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

export type EncryptedPayload = {
  /** Ciphertext + GCM auth tag (concatenated). */
  content_enc: Buffer;
  /** Random IV (12 bytes for GCM). */
  content_iv: Buffer;
};

/**
 * Encrypt UTF-8 plaintext for storage in memory_entries.content_enc / content_iv.
 */
export function encryptMemoryContentWithKey(plaintext: string, key: Buffer): EncryptedPayload {
  const iv = randomBytes(GCM_IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    content_enc: Buffer.concat([enc, tag]),
    content_iv: iv,
  };
}

export function encryptMemoryContent(plaintext: string): EncryptedPayload {
  return encryptMemoryContentWithKey(plaintext, getMemoryEncryptionKey());
}

/**
 * Decrypt a row from the database back to UTF-8 plaintext.
 */
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
        'AES-GCM authentication failed — usually wrong MEMORY_ENCRYPTION_KEY for this row, truncated/corrupt BYTEA from Postgres, or data not written by this server. If you rotated the key, old rows cannot be decrypted.'
      );
    }
    throw err;
  }
}

export function decryptMemoryContent(content_enc: Buffer, content_iv: Buffer): string {
  return decryptMemoryContentWithKey(content_enc, content_iv, getMemoryEncryptionKey());
}
