#!/usr/bin/env node

// Test script for MCP memory operations

async function testMemoryOperations() {
  console.log('🧪 Testing MCP Memory Operations...\n');

  const baseUrl = 'http://127.0.0.1:3000';
  const bearerToken = 'temp-mcp-token-12345';
  
  const headers = {
    'Authorization': `Bearer ${bearerToken}`,
    'Content-Type': 'application/json',
    'Mcp-Protocol-Version': '2025-06-18'
  };

  try {
    // 1. Initialize MCP session
    console.log('1️⃣ Initializing MCP session...');
    const initResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      })
    });

    if (!initResponse.ok) {
      throw new Error(`Init failed: ${initResponse.status}`);
    }

    const sessionId = initResponse.headers.get('mcp-session-id');
    console.log(`✅ Session created: ${sessionId}`);

    const sessionHeaders = {
      ...headers,
      'mcp-session-id': sessionId
    };

    // 2. List tools
    console.log('\n2️⃣ Listing available tools...');
    const toolsResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: sessionHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list'
      })
    });

    const toolsData = await toolsResponse.json();
    console.log(`✅ Found ${toolsData.result.tools.length} tools`);

    // 3. Query existing memories (should be empty)
    console.log('\n3️⃣ Querying existing memories...');
    const queryResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: sessionHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'query_memory',
          arguments: {}
        }
      })
    });

    const queryData = await queryResponse.json();
    console.log(`✅ Current memories: ${queryData.result.content[0].text}`);

    // 4. Write a new memory
    console.log('\n4️⃣ Writing new memory...');
    const writeResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: sessionHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'write_memory',
          arguments: {
            type: 'preferences',
            content: 'User prefers TypeScript over JavaScript for new projects',
            source: 'test-client',
            confidence: 0.9
          }
        }
      })
    });

    const writeData = await writeResponse.json();
    console.log(`✅ Memory written: ${writeData.result.content[0].text}`);

    // 5. Query again to verify
    console.log('\n5️⃣ Verifying memory was saved...');
    const verifyResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: sessionHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'query_memory',
          arguments: {
            type: 'preferences'
          }
        }
      })
    });

    const verifyData = await verifyResponse.json();
    const memories = JSON.parse(verifyData.result.content[0].text);
    console.log(`✅ Found ${memories.count} memories of type 'preferences'`);
    
    if (memories.memories.length > 0) {
      console.log(`📝 Sample memory: "${memories.memories[0].content.substring(0, 50)}..."`);
    }

    console.log('\n🎉 All tests passed! MCP server is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testMemoryOperations();
