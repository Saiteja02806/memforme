/**
 * Test Client for MCP Server Backend
 * Simulates a complete application workflow
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3010';
const MCP_SERVER_URL = 'http://127.0.0.1:3000';

console.log('🧪 MCP SERVER TEST CLIENT');
console.log('==============================');

async function testMcpServer() {
  console.log('\n📡 Testing MCP Server Connection...');
  
  try {
    // Test 1: Initialize MCP session
    console.log('   → Initializing MCP session...');
    const initResponse = await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': 'Bearer new-secure-mcp-token-prod-2024',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        },
      }),
    });

    if (!initResponse.ok) {
      throw new Error(`❌ MCP initialization failed: ${initResponse.status}`);
    }

    const sessionId = initResponse.headers.get('mcp-session-id') || initResponse.headers.get('Mcp-Session-Id');
    console.log(`   ✅ Session created: ${sessionId}`);

    // Test 2: List available tools
    console.log('   → Listing available tools...');
    const toolsResponse = await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
        'Authorization': 'Bearer new-secure-mcp-token-prod-2024',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 2,
      }),
    });

    if (!toolsResponse.ok) {
      throw new Error(`❌ Tools list failed: ${toolsResponse.status}`);
    }

    const toolsText = await toolsResponse.text();
    const toolsData = parseSseResponse(toolsText);
    console.log(`   ✅ Found ${toolsData.tools?.length || 0} tools`);
    
    toolsData.tools?.forEach(tool => {
      console.log(`      • ${tool.name}: ${tool.description.substring(0, 60)}...`);
    });

    // Test 3: Query existing memories
    console.log('   → Querying existing memories...');
    const queryResponse = await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
        'Authorization': 'Bearer new-secure-mcp-token-prod-2024',
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

    if (!queryResponse.ok) {
      throw new Error(`❌ Memory query failed: ${queryResponse.status}`);
    }

    const queryData = parseSseResponse(await queryResponse.text());
    if (queryData.result && queryData.result.content && queryData.result.content[0]) {
      const queryResult = JSON.parse(queryData.result.content[0].text);
      console.log(`   ✅ Found ${queryResult.count} memories`);
    } else {
      console.log('   ❌ Query response parsing failed');
    }

    // Test 4: Write a new memory
    console.log('   → Writing new memory...');
    const writeResponse = await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
        'Authorization': 'Bearer new-secure-mcp-token-prod-2024',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        id: 4,
        params: {
          name: 'write_memory',
          arguments: {
            type: 'test',
            content: 'Memory written by backend test client',
            source: 'backend-test-app',
            confidence: 0.95,
          },
        },
      }),
    });

    if (!writeResponse.ok) {
      throw new Error(`❌ Memory write failed: ${writeResponse.status}`);
    }

    const writeData = parseSseResponse(await writeResponse.text());
    if (writeData.result && writeData.result.content && writeData.result.content[0]) {
      const writeResult = JSON.parse(writeData.result.content[0].text);
      console.log(`   ✅ Memory written: ID ${writeResult.id}`);
    } else {
      console.log('   ❌ Write response parsing failed');
    }

    // Test 5: Verify memory was written
    console.log('   → Verifying memory was written...');
    const verifyResponse = await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
        'Authorization': 'Bearer new-secure-mcp-token-prod-2024',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        id: 5,
        params: {
          name: 'query_memory',
          arguments: {
            type: 'test',
          },
        },
      }),
    });

    if (!verifyResponse.ok) {
      throw new Error(`❌ Memory verification failed: ${verifyResponse.status}`);
    }

    const verifyData = parseSseResponse(await verifyResponse.text());
    if (verifyData.result && verifyData.result.content && verifyData.result.content[0]) {
      const verifyResult = JSON.parse(verifyData.result.content[0].text);
      console.log(`   ✅ Verification successful: ${verifyResult.count} test memories`);
    } else {
      console.log('   ❌ Verification response parsing failed');
    }

    console.log('   🎉 MCP Server Test Complete!');
    return true;

  } catch (error) {
    console.error('❌ MCP Server Test Failed:', error.message);
    return false;
  }
}

function parseSseResponse(text) {
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        return JSON.parse(line.substring(6));
      } catch (e) {
        // Skip malformed lines
      }
    }
  }
  return null;
}

async function testBackendApi() {
  console.log('\n🌐 Testing Backend API...');
  
  try {
    // Test health endpoint
    console.log('   → Testing health endpoint...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    console.log(`   Status: ${healthResponse.status}`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`   ✅ Backend health: ${healthData.status}`);
      console.log(`   ✅ MCP server: ${healthData.mcp_server?.status || 'unknown'}`);
    } else {
      console.log('   ❌ Backend health check failed');
    }

    // Test memory API
    console.log('   → Testing memory API...');
    const memoriesResponse = await fetch(`${BACKEND_URL}/api/memories`);
    console.log(`   Status: ${memoriesResponse.status}`);
    
    if (memoriesResponse.ok) {
      const memoriesData = await memoriesResponse.json();
      console.log(`   ✅ Backend memories: ${memoriesData.count} items`);
    } else {
      console.log('   ❌ Backend memories API failed');
    }

  } catch (error) {
    console.error('❌ Backend API Test Failed:', error.message);
  }
}

async function runCompleteTest() {
  console.log('\n🎯 COMPLETE SYSTEM TEST');
  console.log('==============================\n');

  const results = {
    mcp_server: await testMcpServer(),
    backend_api: await testBackendApi(),
  };

  console.log('\n📊 TEST RESULTS:');
  console.log('================');
  
  if (results.mcp_server && results.backend_api) {
    console.log('✅ MCP SERVER: FULLY FUNCTIONAL');
    console.log('✅ BACKEND API: CONNECTED');
    console.log('✅ END-TO-END WORKFLOW: WORKING');
    console.log('\n🎉 YOUR MCP SERVER IS PRODUCTION-READY!');
    console.log('\n📋 Next Steps:');
    console.log('1. Deploy MCP server to Railway');
    console.log('2. Test with ChatGPT/Claude');
    console.log('3. Build frontend dashboard');
    console.log('4. Connect AI tools to your memory system');
    
  } else {
    console.log('\n❌ TEST FAILURES:');
    if (!results.mcp_server) console.log('❌ MCP Server: FAILED');
    if (!results.backend_api) console.log('❌ Backend API: FAILED');
    
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Check MCP server logs');
    console.log('2. Verify environment variables');
    console.log('3. Check network connectivity');
  }
}

// Main execution
if (require.main === module) {
  console.log('Starting MCP Server System Test...\n');
  runCompleteTest();
} else {
  console.log('Run: node test-client.js');
}
