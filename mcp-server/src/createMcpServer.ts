import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { recordToolAudit } from './audit/toolAudit.js';
import { assertScope } from './auth/resolveMcpUser.js';
import { byteaToBuffer } from './crypto/bytea.js';
import { decryptMemoryContent, encryptMemoryContent } from './crypto/memoryEncryption.js';
import { touchCaptureSession } from './orchestrator/captureSession.js';
import { recordTypeOverlapConflict } from './orchestrator/writeConflict.js';
import { scheduleMarkdownResync } from './queue/scheduleMarkdownResync.js';
import { resyncUserMarkdownFiles } from './storage/markdownSync.js';
import { embedText, toVectorLiteral } from './embeddings/openaiEmbeddings.js';

const memoryTypeSchema = z.enum([
  'stack',
  'preferences',
  'decisions',
  'goals',
  'context',
]);

export type McpServerContext = {
  userId: string;
  scopes: string[];
  supabase: SupabaseClient;
  tokenId: string;
  /** Redis capture key for new public.sessions row when REDIS_URL is set. */
  captureBufferKey: string | null;
};

function mapSourceLabel(label: string): 'model' | 'user' | 'system' {
  const l = label.trim().toLowerCase();
  if (l === 'user' || l === 'human') {
    return 'user';
  }
  if (l === 'system') {
    return 'system';
  }
  return 'model';
}

function truncateText(s: string, maxChars?: number): string {
  if (maxChars == null || s.length <= maxChars) {
    return s;
  }
  return `${s.slice(0, maxChars)}…`;
}

async function withOrchestration(
  ctx: McpServerContext,
  toolName: string
): Promise<void> {
  await touchCaptureSession(
    ctx.supabase,
    ctx.userId,
    toolName,
    ctx.captureBufferKey
  );
  try {
    await recordToolAudit(ctx.supabase, {
      userId: ctx.userId,
      tokenId: ctx.tokenId,
      toolName,
    });
  } catch (err) {
    console.warn(
      `[mcp] mcp_tool_audit insert skipped (apply migration 002 if missing): ${err instanceof Error ? err.message : err}`
    );
  }
}

/**
 * New MCP server instance per Streamable HTTP session, bound to one resolved user + Supabase client.
 */
export function createMemoryMcpServer(ctx: McpServerContext): McpServer {
  const { userId, scopes, supabase } = ctx;

  const server = new McpServer(
    {
      name: 'cross-model-memory',
      version: '0.2.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.registerTool(
    'query_memory',
    {
      description:
        'Read stored memories for the connected user from Postgres (decrypted). Optional filter by type and substring query. Supports limit and per-row character budget for retrieval policy.',
      inputSchema: {
        query: z.string().optional().describe('Optional case-insensitive filter on decrypted text'),
        type: memoryTypeSchema.optional().describe('Memory category'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Max memories after filter (default 50)'),
        max_chars_per_memory: z
          .number()
          .int()
          .min(80)
          .max(100_000)
          .optional()
          .describe('Truncate each memory content to this many characters (optional)'),
      },
      annotations: {
        title: 'Query memory',
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ query, type, limit, max_chars_per_memory }) => {
      assertScope(scopes, 'read');
      await withOrchestration(ctx, 'query_memory');
      const effectiveLimit = limit ?? 50;
      let qb = supabase
        .from('memory_entries')
        .select('id, type, content_enc, content_iv, confidence, version, created_at, updated_at')
        .eq('user_id', userId)
        .eq('is_active', true);
      if (type) {
        qb = qb.eq('type', type);
      }
      const { data, error } = await qb.order('updated_at', { ascending: false });
      if (error) {
        throw new Error(`query_memory: ${error.message}`);
      }

      type OkRow = {
        id: string;
        type: string;
        content: string;
        confidence: unknown;
        version: number;
        created_at: string;
        updated_at: string;
      };
      type BadRow = {
        id: string;
        type: string;
        decrypt_failed: true;
        error: string;
        content_iv_bytes: number;
        content_enc_bytes: number;
      };

      const rows: (OkRow | BadRow)[] = [];
      for (const row of data ?? []) {
        try {
          const enc = byteaToBuffer(row.content_enc);
          const iv = byteaToBuffer(row.content_iv);
          const text = decryptMemoryContent(enc, iv);
          rows.push({
            id: row.id,
            type: row.type,
            content: truncateText(text, max_chars_per_memory),
            confidence: row.confidence,
            version: row.version,
            created_at: row.created_at,
            updated_at: row.updated_at,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(
            `[mcp] query_memory decrypt failed entry_id=${row.id} user_id=${userId}: ${msg}`
          );
          let ivB = -1;
          let encB = -1;
          try {
            ivB = byteaToBuffer(row.content_iv).length;
          } catch {
            /* ignore */
          }
          try {
            encB = byteaToBuffer(row.content_enc).length;
          } catch {
            /* ignore */
          }
          rows.push({
            id: row.id,
            type: row.type,
            decrypt_failed: true,
            error: msg,
            content_iv_bytes: ivB,
            content_enc_bytes: encB,
          });
        }
      }

      const filtered = query
        ? rows.filter((r) => {
            if ('decrypt_failed' in r && r.decrypt_failed) {
              return false;
            }
            return (r as OkRow).content.toLowerCase().includes(query.toLowerCase());
          })
        : rows;
      const capped = filtered.slice(0, effectiveLimit);
      const failures = rows.filter((r) => 'decrypt_failed' in r && r.decrypt_failed).length;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                count: capped.length,
                limit: effectiveLimit,
                truncated_total: filtered.length > effectiveLimit,
                decrypt_failures_in_query: failures,
                note:
                  failures > 0
                    ? 'Some rows failed AES-GCM decrypt (see decrypt_failed entries). Common causes: MEMORY_ENCRYPTION_KEY differs from when data was written, or rows were not created by this MCP server.'
                    : undefined,
                memories: capped,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    'write_memory',
    {
      description:
        'Insert a new encrypted memory row for the connected user and refresh Markdown files in Storage.',
      inputSchema: {
        type: memoryTypeSchema,
        content: z.string().min(1).describe('Memory text to store'),
        source: z.string().describe('Who proposed this (e.g. chatgpt, claude, user)'),
        confidence: z.number().min(0).max(1).describe('Self-reported confidence 0–1'),
      },
      annotations: {
        title: 'Write memory',
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      assertScope(scopes, 'suggest_write');
      await withOrchestration(ctx, 'write_memory');

      const { data: prior } = await supabase
        .from('memory_entries')
        .select('id, content_enc, content_iv')
        .eq('user_id', userId)
        .eq('type', args.type)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prior) {
        const oldText = decryptMemoryContent(
          byteaToBuffer(prior.content_enc),
          byteaToBuffer(prior.content_iv)
        );
        await recordTypeOverlapConflict({
          supabase,
          userId,
          entryId: prior.id,
          existingPlaintext: oldText,
          incomingPlaintext: args.content,
        });
      }

      const { content_enc, content_iv } = encryptMemoryContent(args.content);
      const source = mapSourceLabel(args.source);
      const { data, error } = await supabase
        .from('memory_entries')
        .insert({
          user_id: userId,
          type: args.type,
          content_enc,
          content_iv,
          source,
          confidence: args.confidence,
        })
        .select('id')
        .single();
      if (error) {
        throw new Error(`write_memory: ${error.message}`);
      }
      if (process.env.REDIS_URL?.trim()) {
        await scheduleMarkdownResync(supabase, userId);
      } else {
        await resyncUserMarkdownFiles(supabase, userId);
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: true, id: data.id }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    'update_memory',
    {
      description:
        'Update an existing memory entry (new encrypted content, version bump, history row) and resync Markdown files.',
      inputSchema: {
        entry_id: z.string().uuid(),
        content: z.string().min(1),
        reason: z.string(),
      },
      annotations: {
        title: 'Update memory',
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      assertScope(scopes, 'suggest_write');
      await withOrchestration(ctx, 'update_memory');
      const { data: existing, error: fetchErr } = await supabase
        .from('memory_entries')
        .select('id, version, content_enc, content_iv')
        .eq('id', args.entry_id)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      if (fetchErr) {
        throw new Error(`update_memory: ${fetchErr.message}`);
      }
      if (!existing) {
        throw new Error('update_memory: entry not found or not owned by this user');
      }
      const oldEnc = byteaToBuffer(existing.content_enc);
      const oldIv = byteaToBuffer(existing.content_iv);
      const { error: verErr } = await supabase.from('memory_versions').insert({
        entry_id: existing.id,
        user_id: userId,
        version_number: existing.version,
        content_enc: oldEnc,
        content_iv: oldIv,
        changed_by: 'mcp',
        change_reason: args.reason,
      });
      if (verErr) {
        throw new Error(`update_memory (version): ${verErr.message}`);
      }
      const { content_enc, content_iv } = encryptMemoryContent(args.content);
      const nextVersion = existing.version + 1;
      const { error: updErr } = await supabase
        .from('memory_entries')
        .update({
          content_enc,
          content_iv,
          version: nextVersion,
        })
        .eq('id', args.entry_id)
        .eq('user_id', userId);
      if (updErr) {
        throw new Error(`update_memory: ${updErr.message}`);
      }
      if (process.env.REDIS_URL?.trim()) {
        await scheduleMarkdownResync(supabase, userId);
      } else {
        await resyncUserMarkdownFiles(supabase, userId);
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: true, id: args.entry_id, version: nextVersion }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    'delete_memory',
    {
      description:
        'Soft-delete a memory entry (is_active = false) for the connected user and resync Markdown files.',
      inputSchema: {
        entry_id: z.string().uuid(),
        reason: z.string(),
      },
      annotations: {
        title: 'Delete memory',
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      assertScope(scopes, 'suggest_write');
      await withOrchestration(ctx, 'delete_memory');
      const { data: existing, error: fetchErr } = await supabase
        .from('memory_entries')
        .select('id')
        .eq('id', args.entry_id)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      if (fetchErr) {
        throw new Error(`delete_memory: ${fetchErr.message}`);
      }
      if (!existing) {
        throw new Error('delete_memory: entry not found or not owned by this user');
      }
      const { error: delErr } = await supabase
        .from('memory_entries')
        .update({ is_active: false })
        .eq('id', args.entry_id)
        .eq('user_id', userId);
      if (delErr) {
        throw new Error(`delete_memory: ${delErr.message}`);
      }
      if (process.env.REDIS_URL?.trim()) {
        await scheduleMarkdownResync(supabase, userId);
      } else {
        await resyncUserMarkdownFiles(supabase, userId);
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: true, id: args.entry_id, soft_deleted: true }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    'store_project_fact',
    {
      description:
        'Upsert structured project metadata for Cortex memory: tech_stack (JSON) and strict_rules (string array) keyed by project_name for the connected user.',
      inputSchema: {
        project_name: z.string().min(1).describe('Stable project key, e.g. memforme'),
        tech_stack: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Arbitrary JSON object describing stack'),
        strict_rules: z
          .array(z.string())
          .optional()
          .describe('Non-negotiable rules or constraints'),
      },
      annotations: {
        title: 'Store project fact',
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      assertScope(scopes, 'suggest_write');
      await withOrchestration(ctx, 'store_project_fact');
      const now = new Date().toISOString();
      const { error } = await supabase.from('project_facts').upsert(
        {
          user_id: userId,
          project_name: args.project_name.trim(),
          tech_stack: args.tech_stack ?? {},
          strict_rules: args.strict_rules ?? [],
          updated_at: now,
        },
        { onConflict: 'user_id,project_name' }
      );
      if (error) {
        throw new Error(`store_project_fact: ${error.message}`);
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { ok: true, project_name: args.project_name.trim(), updated_at: now },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    'store_experience',
    {
      description:
        'Store a free-text experience or bug note with an embedding (OpenAI) in Postgres pgvector for semantic search. Requires OPENAI_API_KEY.',
      inputSchema: {
        project_name: z.string().min(1),
        memory_text: z.string().min(1).describe('Experience / bug / note to embed and store'),
      },
      annotations: {
        title: 'Store experience',
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      assertScope(scopes, 'suggest_write');
      await withOrchestration(ctx, 'store_experience');
      const embedding = await embedText(args.memory_text);
      const literal = toVectorLiteral(embedding);
      const { data, error } = await supabase
        .from('experiences')
        .insert({
          user_id: userId,
          project_name: args.project_name.trim(),
          memory_text: args.memory_text,
          embedding: literal,
        })
        .select('id')
        .single();
      if (error) {
        throw new Error(`store_experience: ${error.message}`);
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ok: true,
                id: data?.id,
                project_name: args.project_name.trim(),
                embedding_dims: embedding.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    'search_cortex_memory',
    {
      description:
        'Hybrid Cortex search: embed the query (OpenAI), find nearest experiences (pgvector cosine) for this user, then attach matching project_facts rows. Requires OPENAI_API_KEY.',
      inputSchema: {
        search_query: z.string().min(1),
        limit: z.number().int().min(1).max(50).optional().describe('Max experience rows (default 10)'),
      },
      annotations: {
        title: 'Search cortex memory',
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      assertScope(scopes, 'read');
      await withOrchestration(ctx, 'search_cortex_memory');
      const qVec = await embedText(args.search_query);
      const limit = args.limit ?? 10;
      const { data: expRows, error: rpcErr } = await supabase.rpc('search_experiences_for_user', {
        p_user_id: userId,
        p_query: toVectorLiteral(qVec),
        p_limit: limit,
      });
      if (rpcErr) {
        throw new Error(`search_cortex_memory: ${rpcErr.message}`);
      }
      const experiences = (expRows ?? []) as Array<{
        id: string;
        project_name: string;
        memory_text: string;
        distance: number;
      }>;
      const names = [...new Set(experiences.map((e) => e.project_name))];
      let facts: Array<{
        project_name: string;
        tech_stack: unknown;
        strict_rules: string[];
      }> = [];
      if (names.length > 0) {
        const { data: factRows, error: factErr } = await supabase
          .from('project_facts')
          .select('project_name, tech_stack, strict_rules')
          .eq('user_id', userId)
          .in('project_name', names);
        if (factErr) {
          throw new Error(`search_cortex_memory (project_facts): ${factErr.message}`);
        }
        facts = (factRows ?? []) as typeof facts;
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                query: args.search_query,
                experiences,
                project_facts: facts,
                note:
                  facts.length === 0 && names.length > 0
                    ? 'No project_facts rows for these project_name values; use store_project_fact to add structured metadata.'
                    : undefined,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  return server;
}
