#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const baseUrl = 'http://127.0.0.1:3000';
const bearerToken = 'temp-mcp-token-12345';

async function comprehensiveTest() {
  console.log('🧪 Comprehensive MCP Test...\n');

  try {
    // Step 1: Initialize session
    console.log('=== STEP 1: INITIALIZATION ===');
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
          clientInfo: { name: 'comprehensive-test', version: '1.0.0' },
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
    console.log(`✅ Session ID: ${sessionId}`);

    // Parse init response to see if there are any issues
    const initText = await initResponse.text();
    const initLines = initText.split('\n');
    for (const line of initLines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          console.log(`📡 Init Response: ${JSON.stringify(data)}`);
        } catch (e) {
          console.log(`❌ Failed to parse init line: ${line}`);
        }
      }
    }

    // Step 2: Wait a moment then test tools/list
    console.log('\n=== STEP 2: TOOLS LIST ===');
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay

    const toolsResponse = await fetch(`${baseUrl}/mcp`, {
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

    console.log(`Tools Status: ${toolsResponse.status}`);
    
    if (toolsResponse.ok) {
      const toolsText = await toolsResponse.text();
      const toolsLines = toolsText.split('\n');
      for (const line of toolsLines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            console.log(`🔧 Tools Response: ${JSON.stringify(data)}`);
          } catch (e) {
            console.log(`❌ Failed to parse tools line: ${line}`);
          }
        }
      }
    } else {
      const errorText = await toolsResponse.text();
      console.error(`❌ Tools failed: ${errorText}`);
    }

    // Step 3: Try query_memory
    console.log('\n=== STEP 3: QUERY MEMORY ===');
    await new Promise(resolve => setTimeout(resolve, 100));

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
        id: 3,
        params: {
          name: 'query_memory',
          arguments: {},
        },
      }),
    });

    console.log(`Query Status: ${queryResponse.status}`);
    
    if (queryResponse.ok) {
      const queryText = await queryResponse.text();
      const queryLines = queryText.split('\n');
      for (const line of queryLines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.isError) {
              console.log(`❌ Query returned error: ${JSON.stringify(data)}`);
            } else {
              console.log(`📝 Query Response: ${JSON.stringify(data)}`);
            }
          } catch (e) {
            console.log(`❌ Failed to parse query line: ${line}`);
          }
        }
      }
    } else {
      const errorText = await queryResponse.text();
      console.error(`❌ Query failed: ${errorText}`);
    }

    console.log('\n🎉 Comprehensive test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

comprehensiveTest();
