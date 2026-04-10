import type { EncryptedPayload } from './memoryEncryption.js';

/** Single BYTEA for tables that only have one blob column (e.g. conflicts.value_*_enc). */
export function packEncryptedPayload(p: EncryptedPayload): Buffer {
  return Buffer.concat([p.content_iv, p.content_enc]);
}
