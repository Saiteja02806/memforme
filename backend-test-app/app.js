/**
 * Basic Backend Application to Test MCP Server Functionality
 * This simulates a complete application that uses your MCP server
 */

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3010;

// MCP Server Configuration
const MCP_BASE_URL = 'http://127.0.0.1:3000';
const MCP_BEARER_TOKEN = 'new-secure-mcp-token-prod-2024';

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'backend-test-app',
    timestamp: new Date().toISOString(),
    mcp_server: {
      url: MCP_BASE_URL,
      status: 'connected'
    }
  });
});

// MCP Proxy endpoints
app.all('/mcp/*', async (req, res) => {
  try {
    const targetUrl = `${MCP_BASE_URL}${req.originalUrl.replace('/mcp', '')}`;
    console.log(`🔄 Proxying MCP request: ${req.method} ${req.originalUrl} -> ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'],
        'Authorization': req.headers['authorization'],
        'mcp-session-id': req.headers['mcp-session-id'],
        'Accept': req.headers['accept'],
      },
      body: req.body,
    });

    // Forward response headers
    Object.entries(response.headers.raw()).forEach(([key, value]) => {
      if (key.toLowerCase().startsWith('access-control-')) {
        res.header(key, value);
      } else if (key.toLowerCase() !== 'content-length') {
        res.header(key, value);
      }
    });

    // Send response
    const responseText = await response.text();
    res.status(response.status).send(responseText);
    
  } catch (error) {
    console.error('❌ MCP Proxy Error:', error.message);
    res.status(500).json({
      error: 'MCP proxy failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Memory management endpoints
app.get('/api/memories', async (req, res) => {
  try {
    console.log('📋 Fetching memories from MCP server...');
    
    // Initialize MCP session
    const initResponse = await fetch(`${MCP_BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${MCP_BEARER_TOKEN}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'backend-test-app', version: '1.0.0' }
        },
      }),
    });

    if (!initResponse.ok) {
      throw new Error(`MCP initialization failed: ${initResponse.status}`);
    }

    const sessionId = initResponse.headers.get('mcp-session-id') || initResponse.headers.get('Mcp-Session-Id');
    console.log(`✅ MCP Session created: ${sessionId}`);

    // Query memories
    const queryResponse = await fetch(`${MCP_BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
        'Authorization': `Bearer ${MCP_BEARER_TOKEN}`,
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
      throw new Error(`Memory query failed: ${queryResponse.status}`);
    }

    // Parse SSE response
    const queryText = await queryResponse.text();
    const lines = queryText.split('\n');
    let memories = [];
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          if (data.result && data.result.content && data.result.content[0]) {
            memories = JSON.parse(data.result.content[0].text);
            break;
          }
        } catch (e) {
          // Skip malformed lines
        }
      }
    }

    console.log(`📊 Retrieved ${memories.count} memories`);
    res.json({
      success: true,
      memories: memories.memories || [],
      count: memories.count || 0,
      source: 'mcp_server',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Memory fetch error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch memories',
      message: error.message
    });
  }
});

// Write memory endpoint
app.post('/api/memories', async (req, res) => {
  try {
    const { type, content, source, confidence } = req.body;
    
    if (!type || !content || !source || confidence === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['type', 'content', 'source', 'confidence']
      });
    }

    console.log('💾 Writing memory via MCP server...');

    // Initialize MCP session
    const initResponse = await fetch(`${MCP_BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${MCP_BEARER_TOKEN}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 3,
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'backend-test-app', version: '1.0.0' }
        },
      }),
    });

    if (!initResponse.ok) {
      throw new Error(`MCP initialization failed: ${initResponse.status}`);
    }

    const sessionId = initResponse.headers.get('mcp-session-id') || initResponse.headers.get('Mcp-Session-Id');

    // Write memory
    const writeResponse = await fetch(`${MCP_BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
        'Authorization': `Bearer ${MCP_BEARER_TOKEN}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        id: 4,
        params: {
          name: 'write_memory',
          arguments: {
            type: type,
            content: content,
            source: source,
            confidence: parseFloat(confidence)
          },
        },
      }),
    });

    if (!writeResponse.ok) {
      throw new Error(`Memory write failed: ${writeResponse.status}`);
    }

    // Parse response
    const writeText = await writeResponse.text();
    const lines = writeText.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          if (data.result && data.result.content && data.result.content[0]) {
            const result = JSON.parse(data.result.content[0].text);
            console.log(`✅ Memory written: ID ${result.id}`);
            res.json({
              success: true,
              memory_id: result.id,
              message: 'Memory written successfully',
              timestamp: new Date().toISOString()
            });
            return;
          }
        } catch (e) {
          // Skip malformed lines
        }
      }
    }

    throw new Error('Memory write response parsing failed');

  } catch (error) {
    console.error('❌ Memory write error:', error.message);
    res.status(500).json({
      error: 'Failed to write memory',
      message: error.message
    });
  }
});

// Test results endpoint
app.get('/api/test-results', (req, res) => {
  res.json({
    test_status: 'ready',
    mcp_server: {
      url: MCP_BASE_URL,
      bearer_token: MCP_BEARER_TOKEN,
      status: 'configured_for_testing'
    },
    backend_app: {
      url: `http://localhost:${PORT}`,
      status: 'running',
      purpose: 'test_mcp_functionality'
    },
    available_endpoints: {
      health: '/health',
      memories: '/api/memories',
      write_memory: '/api/memories (POST)',
      mcp_proxy: '/mcp/*'
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend Test App running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /api/test-results - Test configuration`);
  console.log(`   GET  /api/memories - View memories`);
  console.log(`   POST /api/memories - Write memory`);
  console.log(`   ALL   /mcp/* - MCP proxy endpoints`);
  console.log(`🔗 Open http://localhost:${PORT} to test`);
});
