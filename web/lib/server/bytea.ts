import { Buffer } from 'node:buffer';

type JsonBufferShape = { type: string; data?: number[] };

function isJsonBuffer(value: unknown): value is JsonBufferShape {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as JsonBufferShape).type === 'Buffer' &&
    Array.isArray((value as JsonBufferShape).data)
  );
}

/** Keep in sync with mcp-server/src/crypto/bytea.ts */
export function byteaToBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return Buffer.from(value);
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  if (isJsonBuffer(value)) {
    return Buffer.from(value.data as number[]);
  }
  if (typeof value === 'string') {
    const hex = value.startsWith('\\x') ? value.slice(2) : value;
    if (/^[0-9a-fA-F]+$/.test(hex)) {
      if (hex.length % 2 !== 0) {
        throw new Error(
          `BYTEA hex has odd length (${hex.length}) after \\x — possible truncation`
        );
      }
      return hex.length === 0 ? Buffer.alloc(0) : Buffer.from(hex, 'hex');
    }
    if (/^[A-Za-z0-9+/]+=*$/.test(value) && value.length % 4 === 0) {
      return Buffer.from(value, 'base64');
    }
    throw new Error(
      `Unrecognized BYTEA string (expected \\\\x + hex or base64); preview=${value.slice(0, 24)}`
    );
  }
  throw new Error(`Unsupported BYTEA format from database: ${typeof value}`);
}
