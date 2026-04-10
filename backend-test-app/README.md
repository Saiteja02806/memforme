# MCP Server Backend Test Application

## Purpose

This application provides a **complete testing environment** for your Cross-Model Memory Layer MCP server. It simulates a real application that would use your MCP server, allowing you to test all functionality end-to-end.

## Architecture

```
Test Client (test-client.js) 
    |
    v
Backend Test App (app.js on port 3010)
    |
    v
MCP Server (your server on port 3000)
    |
    v
Supabase Database
```

## Quick Start

### 1. Install Dependencies
```bash
cd backend-test-app
npm install
```

### 2. Start Your MCP Server
```bash
cd ../mcp-server
npm run dev
```

### 3. Start Test Backend
```bash
cd backend-test-app
npm start
```

### 4. Run Comprehensive Tests
```bash
npm test
```

## Available Endpoints

### Backend Test App (http://localhost:3010)

- `GET /health` - Health check and status
- `GET /api/test-results` - Test configuration info
- `GET /api/memories` - View memories via MCP
- `POST /api/memories` - Write new memory via MCP
- `ALL /mcp/*` - Direct MCP proxy endpoints

### Test Features

1. **MCP Protocol Testing**
   - Session initialization
   - Tool discovery
   - Memory operations
   - Error handling

2. **API Integration Testing**
   - RESTful endpoints
   - Error responses
   - Data formatting
   - CORS handling

3. **End-to-End Workflows**
   - Write memory via API
   - Read memory via MCP
   - Verify database consistency
   - Test encryption/decryption

## Test Scenarios

### Scenario 1: Basic Memory Operations
```bash
# Test writing a memory
curl -X POST http://localhost:3010/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "type": "preferences",
    "content": "User prefers dark mode in all applications",
    "source": "test-backend",
    "confidence": 0.9
  }'

# Test reading memories
curl http://localhost:3010/api/memories
```

### Scenario 2: Direct MCP Testing
```bash
# Initialize MCP session
curl -X POST http://localhost:3010/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer new-secure-mcp-token-prod-2024" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "id": 1,
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    }
  }'
```

### Scenario 3: Complete Workflow
```bash
# Run the complete test suite
npm test
```

## What This Tests

### 1. MCP Server Functionality
- All 4 tools (query_memory, write_memory, update_memory, delete_memory)
- JSON-RPC 2.0 compliance
- Session management
- Authentication flow

### 2. Database Integration
- PostgreSQL operations
- RLS policies
- Encryption/decryption
- Data consistency

### 3. Security Features
- Token authentication
- CORS configuration
- Input validation
- Error handling

### 4. Performance Characteristics
- Response times
- Concurrent connections
- Memory usage
- Error rates

## Troubleshooting

### Common Issues

1. **MCP Server Not Running**
   ```
   ERROR: connect ECONNREFUSED 127.0.0.1:3000
   ```
   **Solution**: Start your MCP server first: `cd mcp-server && npm run dev`

2. **Authentication Failed**
   ```
   ERROR: 401 Unauthorized
   ```
   **Solution**: Check MCP token in database and environment variables

3. **Encryption Key Mismatch**
   ```
   ERROR: Unsupported state or unable to authenticate data
   ```
   **Solution**: Ensure MCP server uses correct encryption key

### Debug Mode

Enable detailed logging:
```bash
DEBUG=* npm start
```

## Integration with AI Tools

Once your MCP server is tested and working, you can connect:

### ChatGPT
1. Go to ChatGPT Settings
2. Add MCP Connector: `https://your-railway-url.up.railway.app/mcp`
3. Use Bearer token: `new-secure-mcp-token-prod-2024`

### Claude Desktop
1. Edit Claude Desktop config
2. Add MCP server configuration
3. Use same endpoint and token

## Production Deployment

After successful testing:

1. **Deploy MCP Server to Railway**
2. **Update Test App Configuration**
3. **Run Integration Tests**
4. **Connect AI Tools**
5. **Monitor Production Performance**

## Success Criteria

Your MCP server is ready when:

- [ ] All 4 tools work correctly
- [ ] Memory encryption/decryption works
- [ ] Authentication flow works
- [ ] Database operations succeed
- [ ] Error handling is proper
- [ ] Performance is acceptable
- [ ] Security measures are effective

---

**This test application provides a complete environment to validate your MCP server before production deployment!**
