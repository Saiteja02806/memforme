/**
 * Run resync worker only: `npm run worker` (requires REDIS_URL + same Supabase env as API).
 */
import { loadMcpEnv } from './loadEnv.js';
loadMcpEnv();

import { startMarkdownResyncWorker } from './queue/markdownWorker.js';
import { getOptionalRedis } from './queue/redis.js';

if (!getOptionalRedis()) {
  console.error('REDIS_URL is not set; nothing to do.');
  process.exit(1);
}

startMarkdownResyncWorker();
console.log('Worker running. Press Ctrl+C to stop.');
