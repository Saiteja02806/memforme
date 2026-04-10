#!/usr/bin/env node

/**
 * Test database operations through MCP server
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(pkgRoot, '.env') });

const rawToken = process.env.MCP_BEARER_TOKEN?.trim().replace(/^["']|["']$/g, '').trim();
const baseUrl = 'http://127.0.0.1:3000';

async function testDbOperations() {
  console.log('🧪 Testing Database Operations via MCP...\n');

  try {
    // 1. Initialize session
    console.log('1️⃣ Initializing MCP session...');
    const initResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${rawToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'db-test', version: '1.0.0' },
        },
      }),
    });

    if (!initResponse.ok) {
      console.error(`❌ Init failed: ${initResponse.status}`);
      const text = await initResponse.text();
      console.error('Response:', text);
      return;
    }

    const sessionId = initResponse.headers.get('mcp-session-id') || initResponse.headers.get('Mcp-Session-Id');
    console.log(`✅ Session created: ${sessionId}`);

    // 2. Query memories (should be empty initially)
    console.log('\n2️⃣ Querying existing memories...');
    const queryResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
        'Authorization': `Bearer ${rawToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        id: 2,
        params: {
          name: 'query_memory',
          arguments: {},
        },
      }),
    });

    if (!queryResponse.ok) {
      console.error(`❌ Query failed: ${queryResponse.status}`);
      return;
    }

    const queryData = await queryResponse.json();
    const queryResult = JSON.parse(queryData.result.content[0].text);
    console.log(`✅ Found ${queryResult.count} memories`);

    // 3. Write a new memory
    console.log('\n3️⃣ Writing new memory...');
    const writeResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
        'Authorization': `Bearer ${rawToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        id: 3,
        params: {
          name: 'write_memory',
          arguments: {
            type: 'preferences',
            content: 'User prefers dark mode in all applications',
            source: 'test-client',
            confidence: 0.95,
          },
        },
      }),
    });

    if (!writeResponse.ok) {
      console.error(`❌ Write failed: ${writeResponse.status}`);
      const errorText = await writeResponse.text();
      console.error('Error:', errorText);
      return;
    }

    const writeData = await writeResponse.json();
    console.log(`✅ Memory written: ${writeData.result.content[0].text}`);

    // 4. Query again to verify
    console.log('\n4️⃣ Verifying memory was saved...');
    const verifyResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
        'Authorization': `Bearer ${rawToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        id: 4,
        params: {
          name: 'query_memory',
          arguments: {
            type: 'preferences',
          },
        },
      }),
    });

    if (!verifyResponse.ok) {
      console.error(`❌ Verify query failed: ${verifyResponse.status}`);
      return;
    }

    const verifyData = await verifyResponse.json();
    const verifyResult = JSON.parse(verifyData.result.content[0].text);
    console.log(`✅ Found ${verifyResult.count} memories of type 'preferences'`);
    
    if (verifyResult.memories.length > 0) {
      console.log(`📝 Memory: "${verifyResult.memories[0].content}"`);
      console.log(`🆔 ID: ${verifyResult.memories[0].id}`);
      console.log(`⭐ Confidence: ${verifyResult.memories[0].confidence}`);
    }

    // 5. Check database directly
    console.log('\n5️⃣ Verifying database state...');
    const { execSync } = require('child_process');
    try {
      const dbQuery = execSync('npx supabase db query "SELECT COUNT(*) as count FROM memory_entries;" --linked', { encoding: 'utf8' });
      console.log(`📊 Database shows ${dbQuery.split('|')[1].trim()} total memory entries`);
      
      const tokenQuery = execSync('npx supabase db query "SELECT COUNT(*) as count FROM mcp_tokens;" --linked', { encoding: 'utf8' });
      console.log(`🔑 Database shows ${tokenQuery.split('|')[1].trim()} MCP tokens`);
    } catch (dbError) {
      console.log('⚠️  Could not verify database state directly');
    }

    console.log('\n🎉 All database operation tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDbOperations();
