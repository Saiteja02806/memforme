import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Load `mcp-server/.env` no matter the process cwd (e.g. `npm run dev` from repo root).
 */
export function loadMcpEnv(): void {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = path.resolve(here, '..');
  dotenv.config({ path: path.join(pkgRoot, '.env') });
}
