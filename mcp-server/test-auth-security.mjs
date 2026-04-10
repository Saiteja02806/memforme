#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';
import { createHash } from 'node:crypto';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const baseUrl = 'http://127.0.0.1:3000';

async function testAuthSecurity() {
  console.log('🔐 TESTING AUTHENTICATION & SECURITY\n');

  // Test 1: Verify current configuration
  console.log('=== CURRENT CONFIGURATION ===');
  console.log('MCP_DISABLE_ENV_FALLBACK:', process.env.MCP_DISABLE_ENV_FALLBACK);
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
  console.log('MEMORY_ENCRYPTION_KEY length:', process.env.MEMORY_ENCRYPTION_KEY?.length || 'NOT SET');

  // Test 2: Try invalid token
  console.log('\n=== TEST 1: INVALID TOKEN ===');
  try {
    const invalidResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': 'Bearer invalid-token-123',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'security-test', version: '1.0.0' },
        },
      }),
    });

    console.log('Invalid token status:', invalidResponse.status);
    if (invalidResponse.status === 401) {
      console.log('✅ Authentication properly rejects invalid tokens');
    } else {
      console.log('❌ Should have rejected invalid token');
    }
  } catch (error) {
    console.log('❌ Error testing invalid token:', error.message);
  }

  // Test 3: Try expired/revoked token scenario
  console.log('\n=== TEST 2: DATABASE TOKEN VERIFICATION ===');
  const { execSync } = await import('child_process');
  
  try {
    const tokenHash = createHash('sha256').update('new-secure-mcp-token-prod-2024', 'utf8').digest('hex');
    console.log('Expected token hash:', tokenHash);
    
    const dbResult = execSync(`npx supabase db query "SELECT user_id, label, revoked, last_used_at FROM mcp_tokens WHERE token_hash = '${tokenHash}';" --linked`, { encoding: 'utf8' });
    console.log('Database token result:');
    console.log(dbResult);
  } catch (error) {
    console.log('❌ Database token check failed:', error.message);
  }

  // Test 4: Valid token session
  console.log('\n=== TEST 3: VALID TOKEN SESSION ===');
  try {
    const validResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': 'Bearer new-secure-mcp-token-prod-2024',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 2,
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'valid-token-test', version: '1.0.0' },
        },
      }),
    });

    console.log('Valid token status:', validResponse.status);
    
    if (validResponse.ok) {
      const sessionId = validResponse.headers.get('mcp-session-id') || validResponse.headers.get('Mcp-Session-Id');
      console.log('✅ Valid token accepted, session:', sessionId);
      
      // Test session continuity
      console.log('\n=== TEST 3a: SESSION CONTINUITY ===');
      const sessionTestResponse = await fetch(`${baseUrl}/mcp`, {
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
          id: 3,
        }),
      });

      console.log('Session test status:', sessionTestResponse.status);
      
      if (sessionTestResponse.ok) {
        console.log('✅ Session continuity working');
      } else {
        const errorText = await sessionTestResponse.text();
        console.log('❌ Session continuity failed:', errorText);
      }
    } else {
      const errorText = await validResponse.text();
      console.log('❌ Valid token rejected:', errorText);
    }
  } catch (error) {
    console.log('❌ Error testing valid token:', error.message);
  }

  // Test 5: Security headers
  console.log('\n=== TEST 4: SECURITY HEADERS ===');
  try {
    const headersResponse = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Security-Test-Scanner',
        'X-Forwarded-For': 'https://malicious-site.com',
        'Origin': 'https://suspicious-domain.com',
      },
    });

    console.log('Security headers test status:', headersResponse.status);
    const securityHeaders = {
      'cors': headersResponse.headers.get('access-control-allow-origin'),
      'security': headersResponse.headers.get('x-content-type-options'),
      'rateLimit': headersResponse.headers.get('x-ratelimit-limit'),
    };
    console.log('Security headers:', securityHeaders);
  } catch (error) {
    console.log('❌ Security headers test failed:', error.message);
  }

  console.log('\n🎯 AUTHENTICATION & SECURITY TESTS COMPLETE');
}

testAuthSecurity();
