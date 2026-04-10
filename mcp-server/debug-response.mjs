#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const rawToken = process.env.MCP_BEARER_TOKEN?.trim().replace(/^["']|["']$/g, '').trim();
const baseUrl = 'http://127.0.0.1:3000';

async function debugResponse() {
  console.log('🔍 Debugging MCP Response...\n');

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
          clientInfo: { name: 'debug-test', version: '1.0.0' },
        },
      }),
    });

    console.log(`Status: ${initResponse.status}`);
    console.log(`Content-Type: ${initResponse.headers.get('content-type')}`);
    console.log(`Session ID: ${initResponse.headers.get('mcp-session-id')}`);
    
    const responseText = await initResponse.text();
    console.log(`Response (first 500 chars): ${responseText.substring(0, 500)}`);

    // 2. Query memories
    console.log('\n2️⃣ Querying memories...');
    const queryResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': initResponse.headers.get('mcp-session-id'),
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

    console.log(`Query Status: ${queryResponse.status}`);
    console.log(`Query Content-Type: ${queryResponse.headers.get('content-type')}`);
    
    const queryText = await queryResponse.text();
    console.log(`Query Response (first 500 chars): ${queryText.substring(0, 500)}`);

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugResponse();
