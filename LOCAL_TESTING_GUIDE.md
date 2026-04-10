# Local Testing Guide

## Services Running

### Frontend (Next.js)
- **URL**: http://localhost:3007
- **Status**: Running
- **Browser Preview**: Available in IDE

### Backend (MCP Server)
- **URL**: http://127.0.0.1:3000
- **Status**: Running
- **Health Check**: http://127.0.0.1:3000/health

---

## Testing Steps

### 1. Test Frontend Pages

Open http://localhost:3007 in your browser and test:

**Main Pages:**
- **Home** (/) - Landing page with overview
- **Signup** (/signup) - User registration
- **Login** (/login) - User authentication
- **Dashboard** (/dashboard) - Main dashboard (requires auth)
- **Connect** (/connect) - Connection setup guide

**Developer Tools:**
- **Dev Setup** (/dev/setup) - Token SQL generator
- **Dev Check** (/dev/check) - Health check proxy

### 2. Test MCP Server Health

Check the MCP server is running:
```bash
curl http://127.0.0.1:3000/health
```

Expected response:
```json
{"ok":true,"service":"cross-model-memory-mcp"}
```

### 3. Test Authentication Flow

**Step 1: Create User Account**
1. Go to http://localhost:3007/signup
2. Enter email and password
3. Sign up (creates Supabase Auth user)

**Step 2: Generate MCP Token**
Option A - Via Frontend Dashboard:
1. Login at http://localhost:3007/login
2. Go to Dashboard → Connect AI
3. Generate token (creates entry in mcp_tokens table)
4. Copy the Bearer secret

Option B - Via SQL:
1. Use the Dev Setup page: http://localhost:3007/dev/setup
2. Enter your user UUID (from Supabase Auth)
3. Generate a token hash
4. Run the SQL in Supabase SQL Editor

**Step 3: Test MCP Authentication**
```bash
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_SECRET" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
```

### 4. Test Memory Operations

**Write Memory:**
```bash
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_SECRET" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "id":1,
    "params":{
      "name":"write_memory",
      "arguments":{
        "type":"preferences",
        "content":"Test memory content",
        "source":"user",
        "confidence":0.9
      }
    }
  }'
```

**Query Memory:**
```bash
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_SECRET" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "id":2,
    "params":{
      "name":"query_memory",
      "arguments":{
        "type":"preferences"
      }
    }
  }'
```

### 5. Verify in Supabase Dashboard

**Check Token:**
1. Go to Supabase Dashboard → Table Editor
2. Open `public.mcp_tokens` table
3. Filter by your user_id
4. Verify token exists and `revoked = false`

**Check Memory:**
1. Go to Supabase Dashboard → Table Editor
2. Open `public.memory_entries` table
3. Filter by your user_id
4. Verify memory entries (content will be encrypted)

**Check Storage:**
1. Go to Supabase Dashboard → Storage
2. Open `user-memory` bucket
3. Look for folder named after your user UUID
4. Check for markdown files (stack.md, preferences.md, etc.)

---

## Available MCP Tools

Once authenticated, these tools will be available:

- `query_memory` - Retrieve memory entries by type
- `write_memory` - Create new memory entries
- `update_memory` - Update existing memory entries
- `delete_memory` - Remove memory entries
- `list_memory_types` - List available memory types
- `get_memory_stats` - Get memory statistics

---

## Memory Types

- `stack` - Technical stack information
- `preferences` - User preferences and settings
- `decisions` - Decision records
- `goals` - Goals and objectives
- `context` - Contextual information

---

## Troubleshooting

**Frontend not loading:**
- Check port 3007 is not in use
- Verify `.env.local` exists in `web/` directory
- Check browser console for errors

**MCP server not responding:**
- Check port 3000 is not in use
- Verify `.env` exists in `mcp-server/` directory
- Check server logs for errors

**Authentication failing (401):**
- Verify token exists in `mcp_tokens` table
- Check `revoked = false`
- Ensure you're using the plain secret (not the hash)
- Verify `MCP_DISABLE_ENV_FALLBACK=true` in backend

**Memory operations failing:**
- Check Supabase credentials in backend `.env`
- Verify `MEMORY_ENCRYPTION_KEY` is set
- Check RLS policies in Supabase
- Verify user has proper permissions

---

## Configuration Files

**Frontend:**
- `.env.local` - Supabase URL, anon key, MCP server URL
- `package.json` - Dependencies and scripts

**Backend:**
- `.env` - Supabase URL, service role key, encryption key
- `railway.toml` - Railway deployment config

---

## Next Steps After Local Testing

1. **Deploy Frontend:** Push to Vercel or similar
2. **Update Railway:** Set actual environment variables
3. **Configure ChatGPT:** Use Railway URL + Bearer token
4. **Test Production:** End-to-end with ChatGPT integration

---

*Happy Testing!*
