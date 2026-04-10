#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const baseUrl = 'http://127.0.0.1:3000';
const bearerToken = 'temp-mcp-token-12345';

async function finalVerification() {
  console.log('🎯 FINAL VERIFICATION TEST...\n');

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
          clientInfo: { name: 'final-verification', version: '1.0.0' },
        },
      }),
    });

    if (!initResponse.ok) {
      console.error(`❌ Init failed: ${initResponse.status}`);
      return;
    }

    const sessionId = initResponse.headers.get('mcp-session-id') || initResponse.headers.get('Mcp-Session-Id');
    console.log(`✅ Session: ${sessionId}`);

    // Query memories with different parameters
    console.log('\n📝 Testing query_memory with different parameters...');

    const tests = [
      { name: 'All memories', args: {} },
      { name: 'Preferences only', args: { type: 'preferences' } },
      { name: 'Stack only', args: { type: 'stack' } },
      { name: 'Limit 1', args: { limit: 1 } },
      { name: 'Search test', args: { query: 'dark mode' } },
    ];

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      console.log(`\n${i + 1}. ${test.name}:`);
      
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
          id: i + 2,
          params: {
            name: 'query_memory',
            arguments: test.args,
          },
        }),
      });

      if (queryResponse.ok) {
        const queryText = await queryResponse.text();
        const lines = queryText.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.isError) {
                console.log(`   ❌ Error: ${JSON.stringify(data.result?.content?.[0]?.text || data)}`);
              } else if (data.result && data.result.content && data.result.content[0]) {
                const result = JSON.parse(data.result.content[0].text);
                console.log(`   ✅ Found ${result.count} memories`);
                if (result.memories && result.memories.length > 0) {
                  console.log(`   📄 Sample: "${result.memories[0].content.substring(0, 50)}..."`);
                }
              }
              break;
            } catch (e) {
              console.log(`   ❌ Parse error: ${line.substring(0, 100)}`);
            }
          }
        }
      } else {
        console.log(`   ❌ HTTP ${queryResponse.status}`);
      }
    }

    // Test write operation
    console.log('\n✍️ Testing write_memory...');
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
        id: 10,
        params: {
          name: 'write_memory',
          arguments: {
            type: 'decisions',
            content: 'DECISION: Use TypeScript for all new projects - verified working MCP server',
            source: 'verification-test',
            confidence: 1.0,
          },
        },
      }),
    });

    if (writeResponse.ok) {
      const writeText = await writeResponse.text();
      const lines = writeText.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.isError) {
              console.log(`   ❌ Write error: ${JSON.stringify(data.result?.content?.[0]?.text || data)}`);
            } else if (data.result && data.result.content && data.result.content[0]) {
              const result = JSON.parse(data.result.content[0].text);
              console.log(`   ✅ Memory written: ID ${result.id}`);
            }
            break;
          } catch (e) {
            console.log(`   ❌ Parse error: ${line.substring(0, 100)}`);
          }
        }
      }
    } else {
      console.log(`   ❌ Write HTTP ${writeResponse.status}`);
    }

    console.log('\n🎉 VERIFICATION COMPLETE!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

finalVerification();
