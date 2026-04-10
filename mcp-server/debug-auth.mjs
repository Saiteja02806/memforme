#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';
import { createHash } from 'node:crypto';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const baseUrl = 'http://127.0.0.1:3000';
const bearerToken = 'temp-mcp-token-12345';

async function debugAuth() {
  console.log('🔍 Debugging Authentication Process...\n');

  // First, let's verify what hash we expect
  const expectedHash = createHash('sha256').update(bearerToken, 'utf8').digest('hex');
  console.log(`🔑 Expected SHA-256 hash: ${expectedHash}`);

  try {
    // 1. Test initialization
    console.log('\n1️⃣ Testing initialization...');
    const initResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'debug-auth', version: '1.0.0' },
        },
      }),
    });

    console.log(`Init Status: ${initResponse.status}`);
    
    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error(`❌ Init failed: ${errorText}`);
      return;
    }

    const sessionId = initResponse.headers.get('mcp-session-id') || initResponse.headers.get('Mcp-Session-Id');
    console.log(`✅ Session created: ${sessionId}`);

    // 2. Now test a simple call without going through the full MCP flow
    console.log('\n2️⃣ Testing direct database query...');
    
    try {
      const dbResult = await execSync('npx supabase db query "SELECT user_id, scopes FROM mcp_tokens WHERE token_hash = \'\" + expectedHash + \"\' AND NOT revoked;" --linked', { encoding: 'utf8' });
      console.log(`📊 Direct DB query result:`);
      console.log(dbResult);
    } catch (dbError) {
      console.log(`❌ Direct DB query failed: ${dbError.message}`);
    }

    // 3. Test the session with a second call
    console.log('\n3️⃣ Testing session continuity...');
    const testResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
        'Authorization': `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 2,
      }),
    });

    console.log(`Test Status: ${testResponse.status}`);
    
    const testText = await testResponse.text();
    console.log('Test Response (first 500 chars):');
    console.log(testText.substring(0, 500));

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugAuth();
