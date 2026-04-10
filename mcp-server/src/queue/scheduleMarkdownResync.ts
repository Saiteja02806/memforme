import { Queue } from 'bullmq';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resyncUserMarkdownFiles } from '../storage/markdownSync.js';
import { getOptionalRedis } from './redis.js';

let resyncQueue: Queue | null = null;

function queue(): Queue | null {
  const connection = getOptionalRedis();
  if (!connection) {
    return null;
  }
  if (!resyncQueue) {
    resyncQueue = new Queue('memory-markdown-resync', { connection });
  }
  return resyncQueue;
}

/**
 * With REDIS_URL: enqueue debounced resync (worker must run — same process via
 * START_REDIS_WORKER_IN_PROCESS or separate `npm run worker`).
 * Without Redis: synchronous resync (Option A).
 */
export async function scheduleMarkdownResync(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const q = queue();
  if (!q) {
    await resyncUserMarkdownFiles(supabase, userId);
    return;
  }
  await q.add(
    'resync',
    { userId },
    {
      jobId: `user-${userId}`,
      delay: 600,
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );
}
