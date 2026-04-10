#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'child_process';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const baseUrl = 'http://127.0.0.1:3000';

console.log('🔐 AUTHENTICATION & SECURITY TEST\n');

async function testAuth() {
  // Test 1: Check database token
  console.log('=== DATABASE TOKEN CHECK ===');
  try {
    const tokenHash = createHash('sha256').update('new-secure-mcp-token-prod-2024', 'utf8').digest('hex');
    const dbResult = execSync(`npx supabase db query "SELECT user_id, label, revoked FROM mcp_tokens WHERE token_hash = '${tokenHash}';" --linked`, { encoding: 'utf8' });
    console.log('✅ Database token found:', dbResult.includes('production-mcp-token'));
  } catch (error) {
    console.log('❌ Database check failed:', error.message);
  }

  // Test 2: Valid authentication
  console.log('\n=== VALID AUTHENTICATION TEST ===');
  try {
    const response = await fetch(`${baseUrl}/mcp`, {
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
          clientInfo: { name: 'auth-test', version: '1.0.0' },
        },
      }),
    });

    console.log('Auth test status:', response.status);
    if (response.ok) {
      const sessionId = response.headers.get('mcp-session-id');
      console.log('✅ Authentication successful, session:', sessionId);
      
      // Test tools list
      const toolsResponse = await fetch(`${baseUrl}/mcp`, {
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
      
      console.log('Tools list status:', toolsResponse.status);
      if (toolsResponse.ok) {
        console.log('✅ Tools accessible');
      } else {
        console.log('❌ Tools access failed');
      }
    } else {
      console.log('❌ Authentication failed');
    }
  } catch (error) {
    console.log('❌ Auth test error:', error.message);
  }
}

testAuth();
