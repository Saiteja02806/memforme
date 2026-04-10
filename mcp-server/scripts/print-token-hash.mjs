#!/usr/bin/env node
/**
 * Print SHA-256 hex of a Bearer secret for public.mcp_tokens.token_hash
 * Usage: npm run hash-token -- "your-plain-secret"
 *    or: node scripts/print-token-hash.mjs "your-plain-secret"
 */
import { createHash } from 'node:crypto';

const rawArg = process.argv.slice(2).join(' ').trim();
const secret = rawArg.replace(/^["']|["']$/g, '').trim();

if (!secret) {
  console.error(
    'Usage: npm run hash-token -- "<plain-bearer-secret>"\n' +
      'Same string must be sent as Authorization: Bearer <plain-bearer-secret>'
  );
  process.exit(1);
}

const hex = createHash('sha256').update(secret, 'utf8').digest('hex');
console.log('SHA-256 (hex) for mcp_tokens.token_hash:\n');
console.log(hex);
console.log(
  '\nSQL (replace YOUR_USER_UUID with auth.users.id):\n\n' +
    `insert into public.mcp_tokens (user_id, token_hash, label, scopes)\n` +
    `values ('YOUR_USER_UUID'::uuid, '${hex}', 'manual', array['read','suggest_write']::text[])\n` +
    `on conflict (token_hash) do nothing;\n`
);
