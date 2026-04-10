/**
 * Confirm ChatGPT ↔ MCP ↔ Supabase memory flow using the same credentials as the MCP server.
 *
 * Usage (from repo root or mcp-server):
 *   npm run verify:supabase
 *   npm run verify:supabase -- <user-uuid>
 *   VERIFY_USER_ID=<uuid> npm run verify:supabase
 *
 * Options:
 *   --strict   Exit 1 if this user has zero active memory_entries (use after a test write_memory)
 *   --json     Print one JSON object only (for CI)
 *
 * Loads mcp-server/.env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(pkgRoot, '.env') });

const BUCKET = process.env.USER_MEMORY_BUCKET?.trim() || 'user-memory';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function exitCode(code) {
  await new Promise((r) => setTimeout(r, 100));
  process.exit(code);
}

function parseArgs(argv) {
  const strict = argv.includes('--strict');
  const json = argv.includes('--json');
  const pos = argv.filter((a) => !a.startsWith('--'));
  return { strict, json, positional: pos };
}

async function main() {
  const argv = process.argv.slice(2);
  const { strict, json, positional } = parseArgs(argv);

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in mcp-server/.env');
    await exitCode(1);
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId =
    positional[0]?.trim() ||
    process.env.VERIFY_USER_ID?.trim() ||
    process.env.SUPABASE_FALLBACK_USER_ID?.trim();

  if (userId && !UUID_RE.test(userId)) {
    console.error('Invalid user UUID:', userId);
    await exitCode(1);
    return;
  }

  if (!userId) {
    const { data: tok, error: tokErr } = await supabase
      .from('mcp_tokens')
      .select('user_id')
      .eq('revoked', false)
      .limit(1);
    if (tokErr) {
      console.error('mcp_tokens read failed:', tokErr.message);
      await exitCode(1);
      return;
    }
    userId = tok?.[0]?.user_id;
  }

  if (!userId) {
    console.error(
      'No user id: pass UUID as first argument, or set VERIFY_USER_ID / SUPABASE_FALLBACK_USER_ID in .env, or add a row to mcp_tokens.'
    );
    await exitCode(1);
    return;
  }

  const [
    tokensRes,
    memActiveCountRes,
    memSampleRes,
    memTotalRes,
    versionsRes,
    sessionsRes,
    conflictsRes,
    auditRes,
    storageRes,
  ] = await Promise.all([
    supabase.from('mcp_tokens').select('id, label, revoked, last_used_at').eq('user_id', userId),
    supabase
      .from('memory_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('memory_entries')
      .select('id, type, version, updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(8),
    supabase
      .from('memory_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('memory_versions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('sessions')
      .select('id, status, tool_name, last_active_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(5),
    supabase
      .from('conflicts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending'),
    supabase
      .from('mcp_tool_audit')
      .select('tool_name, created_at, token_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.storage.from(BUCKET).list(userId, { limit: 50 }),
  ]);

  const errors = [
    tokensRes.error,
    memActiveCountRes.error,
    memSampleRes.error,
    memTotalRes.error,
    versionsRes.error,
    sessionsRes.error,
    conflictsRes.error,
    auditRes.error,
    storageRes.error,
  ].filter(Boolean);

  if (errors.length) {
    const msg = errors.map((e) => e.message).join('; ');
    console.error('Supabase query error(s):', msg);
    if (msg.includes('mcp_tool_audit') || msg.includes('does not exist')) {
      console.error('Hint: apply migration supabase/migrations/002_mcp_tool_audit.sql');
    }
    await exitCode(1);
    return;
  }

  const activeCount = memActiveCountRes.count ?? 0;
  const totalEntries = memTotalRes.count ?? 0;
  const versionRows = versionsRes.count ?? 0;
  const pendingConflicts = conflictsRes.count ?? 0;
  const files = storageRes.data ?? [];

  const report = {
    user_id: userId,
    bucket: BUCKET,
    mcp_tokens_for_user: (tokensRes.data ?? []).length,
    mcp_tokens: tokensRes.data ?? [],
    memory_entries_active_count: activeCount,
    memory_entries_total_count: totalEntries,
    memory_entries_active_sample: memSampleRes.data ?? [],
    memory_versions_count: versionRows,
    sessions_active_count: sessionsRes.data?.length ?? 0,
    sessions_active_sample: sessionsRes.data ?? [],
    conflicts_pending_count: pendingConflicts,
    mcp_tool_audit_recent: auditRes.data ?? [],
    storage_objects_in_user_folder: files.map((f) => f.name),
    storage_object_count: files.length,
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('\n=== Memforme — Supabase memory flow check ===\n');
    console.log('User (auth.users id):', userId);
    console.log('\n--- MCP auth ---');
    console.log('mcp_tokens rows for this user:', report.mcp_tokens_for_user);
    for (const t of report.mcp_tokens) {
      console.log(
        `  • id=${t.id} label=${t.label ?? '(none)'} revoked=${t.revoked} last_used_at=${t.last_used_at ?? '(never)'}`
      );
    }
    console.log('\n--- Postgres memory ---');
    console.log(
      'memory_entries (active):',
      activeCount,
      '| total rows (any is_active):',
      totalEntries
    );
    if (report.memory_entries_active_sample.length) {
      console.log('Recent active rows (sample):');
      for (const r of report.memory_entries_active_sample) {
        console.log(`  • ${r.id} type=${r.type} v=${r.version} updated_at=${r.updated_at}`);
      }
    }
    console.log('memory_versions (this user):', versionRows);
    console.log('\n--- Orchestrator ---');
    console.log('sessions (active):', report.sessions_active_count);
    console.log('conflicts (pending):', pendingConflicts);
    console.log('\n--- Audit ---');
    if (!report.mcp_tool_audit_recent.length) {
      console.log('mcp_tool_audit: no rows (migration 002 not applied, or no tool calls yet)');
    } else {
      for (const a of report.mcp_tool_audit_recent) {
        console.log(`  • ${a.created_at}  ${a.tool_name}  token_id=${a.token_id}`);
      }
    }
    console.log('\n--- Storage ---');
    console.log(`Bucket "${BUCKET}" path prefix "${userId}/":`, report.storage_object_count, 'object(s)');
    for (const name of report.storage_objects_in_user_folder) {
      console.log(`  • ${userId}/${name}`);
    }
    if (!files.length && activeCount > 0) {
      console.log(
        '\n⚠ Active memories exist but Storage folder is empty — run write/update from MCP again or check REDIS worker (if REDIS_URL) processed resync jobs.'
      );
    }
    console.log('\n=== End ===\n');
    console.log(
      'Dashboard: Supabase → Table Editor (memory_entries, mcp_tokens) | Storage → bucket user-memory → folder = your user UUID.'
    );
  }

  if (strict && activeCount === 0) {
    console.error(
      '[strict] Expected at least one active memory_entries row for this user — run write_memory from ChatGPT or MCP Inspector first.'
    );
    await exitCode(1);
    return;
  }

  await exitCode(0);
}

main().catch(async (e) => {
  console.error(e);
  await exitCode(1);
});
