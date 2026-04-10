/**
 * Re-encrypt memory_entries + memory_versions after MEMORY_ENCRYPTION_KEY rotation.
 *
 * Requires mcp-server/.env (or env) with:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   OLD_MEMORY_ENCRYPTION_KEY — key that was used when rows were written
 *   NEW_MEMORY_ENCRYPTION_KEY — key you will deploy (same format rules as MEMORY_ENCRYPTION_KEY)
 *
 * Usage (from repo root):
 *   npm run reencrypt-memories -- --dry-run
 *   npm run reencrypt-memories -- --user-id=<uuid>
 *
 * After success: set MEMORY_ENCRYPTION_KEY on Railway (and locally) to NEW_MEMORY_ENCRYPTION_KEY.
 * Does not re-encrypt public.conflicts blobs (rare); delete or handle those separately if needed.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { byteaToBuffer } from '../src/crypto/bytea.js';
import {
  deriveMemoryKeyFromSecret,
  decryptMemoryContentWithKey,
  encryptMemoryContentWithKey,
} from '../src/crypto/memoryEncryption.js';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(pkgRoot, '.env') });

const PAGE = 80;

type RowEnc = { id: string; content_enc: unknown; content_iv: unknown };

function parseArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run');
  let userId: string | undefined;
  for (const a of argv) {
    if (a.startsWith('--user-id=')) {
      userId = a.slice('--user-id='.length).trim();
    }
  }
  return { dryRun, userId };
}

async function main() {
  const { dryRun, userId } = parseArgs(process.argv.slice(2));

  const url = process.env.SUPABASE_URL?.trim();
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const oldRaw = process.env.OLD_MEMORY_ENCRYPTION_KEY?.trim();
  const newRaw = process.env.NEW_MEMORY_ENCRYPTION_KEY?.trim();

  if (!url || !svc) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!oldRaw || !newRaw) {
    console.error(
      'Set OLD_MEMORY_ENCRYPTION_KEY (current ciphertext) and NEW_MEMORY_ENCRYPTION_KEY (target).'
    );
    process.exit(1);
  }
  if (oldRaw === newRaw) {
    console.error('OLD and NEW keys must differ.');
    process.exit(1);
  }

  const oldKey = deriveMemoryKeyFromSecret(oldRaw);
  const newKey = deriveMemoryKeyFromSecret(newRaw);

  const supabase = createClient(url, svc, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let updatedEntries = 0;
  let skippedEntries = 0;
  let updatedVersions = 0;
  let skippedVersions = 0;

  async function processTable(
    table: 'memory_entries' | 'memory_versions',
    label: string
  ): Promise<void> {
    let offset = 0;
    for (;;) {
      let q = supabase.from(table).select('id, content_enc, content_iv');
      if (userId) {
        q = q.eq('user_id', userId);
      }
      q = q.order('id', { ascending: true }).range(offset, offset + PAGE - 1);

      const { data, error } = await q;
      if (error) {
        console.error(`${label} fetch failed:`, error.message);
        process.exit(1);
      }
      const rows = (data ?? []) as RowEnc[];
      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        let plain: string;
        try {
          const enc = byteaToBuffer(row.content_enc);
          const iv = byteaToBuffer(row.content_iv);
          plain = decryptMemoryContentWithKey(enc, iv, oldKey);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`[skip] ${label} ${row.id}: ${msg}`);
          if (table === 'memory_entries') {
            skippedEntries += 1;
          } else {
            skippedVersions += 1;
          }
          continue;
        }

        const payload = encryptMemoryContentWithKey(plain, newKey);
        if (dryRun) {
          console.log(`[dry-run] would update ${label} ${row.id}`);
        } else {
          const { error: upErr } = await supabase
            .from(table)
            .update({
              content_enc: payload.content_enc,
              content_iv: payload.content_iv,
            })
            .eq('id', row.id);
          if (upErr) {
            console.error(`Update failed ${label} ${row.id}:`, upErr.message);
            process.exit(1);
          }
        }
        if (table === 'memory_entries') {
          updatedEntries += 1;
        } else {
          updatedVersions += 1;
        }
      }

      if (rows.length < PAGE) {
        break;
      }
      offset += PAGE;
    }
  }

  console.log(
    dryRun
      ? 'Dry run — no writes.'
      : 'Applying updates (memory_entries, then memory_versions)…'
  );
  if (userId) {
    console.log('Scope: user_id =', userId);
  }

  await processTable('memory_entries', 'memory_entries');
  await processTable('memory_versions', 'memory_versions');

  console.log('\nDone.');
  console.log(
    `memory_entries: ${updatedEntries} ok, ${skippedEntries} skipped (decrypt failed or bad BYTEA)`
  );
  console.log(
    `memory_versions: ${updatedVersions} ok, ${skippedVersions} skipped`
  );
  if (!dryRun && updatedEntries + updatedVersions > 0) {
    console.log('\nDeploy MEMORY_ENCRYPTION_KEY = value you used for NEW_MEMORY_ENCRYPTION_KEY.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
