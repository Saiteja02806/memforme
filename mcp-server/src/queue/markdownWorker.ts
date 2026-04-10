import { Worker } from 'bullmq';
import type { FastifyBaseLogger } from 'fastify';
import { getSupabaseServiceClient } from '../supabase/client.js';
import { resyncUserMarkdownFiles } from '../storage/markdownSync.js';
import { getOptionalRedis } from './redis.js';

/**
 * Process `memory-markdown-resync` jobs. Call once per process that should run workers.
 */
export function startMarkdownResyncWorker(log?: FastifyBaseLogger): Worker | null {
  const connection = getOptionalRedis();
  if (!connection) {
    return null;
  }
  const supabase = getSupabaseServiceClient();
  const worker = new Worker(
    'memory-markdown-resync',
    async (job) => {
      const userId = job.data?.userId as string;
      if (!userId) {
        return;
      }
      await resyncUserMarkdownFiles(supabase, userId);
    },
    { connection }
  );
  worker.on('failed', (job, err) => {
    log?.error({ err, jobId: job?.id }, 'memory-markdown-resync job failed');
  });
  log?.info('BullMQ worker listening on queue memory-markdown-resync');
  return worker;
}
