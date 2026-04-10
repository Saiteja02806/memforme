import { Redis } from 'ioredis';

let shared: Redis | null = null;

/** BullMQ requires `maxRetriesPerRequest: null` on the ioredis client. */
export function getOptionalRedis(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    return null;
  }
  if (!shared) {
    shared = new Redis(url, { maxRetriesPerRequest: null });
  }
  return shared;
}
