#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const baseUrl = 'http://127.0.0.1:3000';
const bearerToken = 'temp-mcp-token-12345';

async function debugFullResponse() {
  console.log('🔍 DEBUGGING FULL RESPONSE...\n');

  try {
    // Initialize session
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
          clientInfo: { name: 'debug-full-response', version: '1.0.0' },
        },
      }),
    });

    const sessionId = initResponse.headers.get('mcp-session-id') || initResponse.headers.get('Mcp-Session-Id');
    console.log(`✅ Session: ${sessionId}`);

    // Get full response
    console.log('\n📡 Getting FULL response...');
    const queryResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
        'Authorization': `Bearer ${bearerToken}`,
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

    console.log(`Status: ${queryResponse.status}`);
    console.log(`Content-Type: ${queryResponse.headers.get('content-type')}`);
    
    const fullText = await queryResponse.text();
    console.log(`Full response length: ${fullText.length} characters`);
    console.log('Full response:');
    console.log(fullText);

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugFullResponse();
