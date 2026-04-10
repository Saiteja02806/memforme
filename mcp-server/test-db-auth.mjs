#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const baseUrl = 'http://127.0.0.1:3000';
const bearerToken = 'temp-mcp-token-12345'; // This should match the database

async function testDbAuth() {
  console.log('🧪 Testing Database Authentication...\n');

  try {
    // 1. Initialize session with Bearer token
    console.log('1️⃣ Initializing MCP session with Bearer token...');
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
          clientInfo: { name: 'db-auth-test', version: '1.0.0' },
        },
      }),
    });

    console.log(`Init Status: ${initResponse.status}`);
    console.log(`Init Headers:`, Object.fromEntries(initResponse.headers.entries()));
    
    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error(`❌ Init failed: ${errorText}`);
      return;
    }

    const sessionId = initResponse.headers.get('mcp-session-id') || initResponse.headers.get('Mcp-Session-Id');
    console.log(`✅ Session created: ${sessionId}`);

    // 2. Write a memory
    console.log('\n2️⃣ Writing memory...');
    const writeResponse = await fetch(`${baseUrl}/mcp`, {
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
          name: 'write_memory',
          arguments: {
            type: 'preferences',
            content: 'User prefers dark mode in all apps',
            source: 'db-auth-test',
            confidence: 0.9,
          },
        },
      }),
    });

    console.log(`Write Status: ${writeResponse.status}`);
    
    const writeText = await writeResponse.text();
    console.log('Write Response (first 800 chars):');
    console.log(writeText.substring(0, 800));

    // Look for successful response
    const lines = writeText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          if (data.result && !data.isError) {
            console.log(`✅ SUCCESS! Memory operation completed`);
            if (data.result.content && data.result.content[0]) {
              const result = JSON.parse(data.result.content[0].text);
              console.log(`📝 Result: ${JSON.stringify(result, null, 2)}`);
            }
          } else if (data.isError) {
            console.log(`❌ Server returned error: ${JSON.stringify(data, null, 2)}`);
          }
        } catch (e) {
          console.log(`❌ Failed to parse line ${i}: ${line}`);
        }
        break;
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDbAuth();
