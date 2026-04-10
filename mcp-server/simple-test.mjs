#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const rawToken = process.env.MCP_BEARER_TOKEN?.trim().replace(/^["']|["']$/g, '').trim();
const baseUrl = 'http://127.0.0.1:3000';

async function simpleTest() {
  console.log('🧪 Simple MCP Write Test...\n');

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
          clientInfo: { name: 'simple-test', version: '1.0.0' },
        },
      }),
    });

    if (!initResponse.ok) {
      console.error(`❌ Init failed: ${initResponse.status}`);
      return;
    }

    const sessionId = initResponse.headers.get('mcp-session-id') || initResponse.headers.get('Mcp-Session-Id');
    console.log(`✅ Session created: ${sessionId}`);

    // 2. Write a simple memory
    console.log('\n2️⃣ Writing simple memory...');
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
        id: 2,
        params: {
          name: 'write_memory',
          arguments: {
            type: 'preferences',
            content: 'User prefers dark mode',
            source: 'test',
            confidence: 0.8,
          },
        },
      }),
    });

    console.log(`Write Status: ${writeResponse.status}`);
    console.log(`Write Content-Type: ${writeResponse.headers.get('content-type')}`);
    
    const writeText = await writeResponse.text();
    console.log('Write Response (raw):');
    console.log(writeText.substring(0, 1000));

    // Look for data: lines
    const lines = writeText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          console.log(`✅ Parsed data: ${JSON.stringify(data, null, 2)}`);
        } catch (e) {
          console.log(`❌ Failed to parse line ${i}: ${line}`);
        }
      } else if (line.startsWith('event: ')) {
        console.log(`📡 Event: ${line.substring(7)}`);
      } else if (line.trim()) {
        console.log(`📄 Other: ${line}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

simpleTest();
