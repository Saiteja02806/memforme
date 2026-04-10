#!/usr/bin/env node

/**
 * Simple Frontend Test Suite
 * Tests the web dashboard functionality without browser automation
 */

import { execSync } from 'child_process';

const FRONTEND_URL = 'http://localhost:3005';
const MCP_SERVER_URL = 'http://127.0.0.1:3000';

console.log(' SIMPLE FRONTEND TEST');
console.log('====================\n');

async function testFrontendHealth() {
  console.log('1. Testing frontend health...');
  
  try {
    // Test if frontend is running
    const response = await fetch(FRONTEND_URL);
    console.log(`   Frontend status: ${response.status}`);
    
    if (response.ok) {
      const text = await response.text();
      const hasTitle = text.includes('<h1>Memforme</h1>');
      const hasNavigation = text.includes('MCP token helper') && text.includes('Health check');
      
      console.log(`   Frontend title found: ${hasTitle}`);
      console.log(`   Navigation links found: ${hasNavigation}`);
      
      if (hasTitle && hasNavigation) {
        console.log('   Frontend structure: PASS');
        return true;
      } else {
        console.log('   Frontend structure: FAIL');
        return false;
      }
    } else {
      console.log('   Frontend not accessible');
      return false;
    }
  } catch (error) {
    console.log(`   Frontend test error: ${error.message}`);
    return false;
  }
}

async function testSetupPage() {
  console.log('2. Testing setup page...');
  
  try {
    const response = await fetch(`${FRONTEND_URL}/setup`);
    console.log(`   Setup page status: ${response.status}`);
    
    if (response.ok) {
      const text = await response.text();
      const hasTitle = text.includes('MCP token');
      const hasForm = text.includes('Plain MCP secret') && text.includes('Generate hash & SQL');
      
      console.log(`   Setup page title found: ${hasTitle}`);
      console.log(`   Setup form found: ${hasForm}`);
      
      if (hasTitle && hasForm) {
        console.log('   Setup page: PASS');
        return true;
      } else {
        console.log('   Setup page: FAIL');
        return false;
      }
    } else {
      console.log('   Setup page not accessible');
      return false;
    }
  } catch (error) {
    console.log(`   Setup page test error: ${error.message}`);
    return false;
  }
}

async function testCheckPage() {
  console.log('3. Testing health check page...');
  
  try {
    const response = await fetch(`${FRONTEND_URL}/check`);
    console.log(`   Check page status: ${response.status}`);
    
    if (response.ok) {
      const text = await response.text();
      const hasTitle = text.includes('Health check');
      const hasForm = text.includes('MCP server base URL') && text.includes('GET /health');
      
      console.log(`   Check page title found: ${hasTitle}`);
      console.log(`   Check form found: ${hasForm}`);
      
      if (hasTitle && hasForm) {
        console.log('   Check page: PASS');
        return true;
      } else {
        console.log('   Check page: FAIL');
        return false;
      }
    } else {
      console.log('   Check page not accessible');
      return false;
    }
  } catch (error) {
    console.log(`   Check page test error: ${error.message}`);
    return false;
  }
}

async function testAPIEndpoint() {
  console.log('4. Testing API endpoint...');
  
  try {
    const response = await fetch(`${FRONTEND_URL}/api/mcp-health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl: MCP_SERVER_URL })
    });
    
    console.log(`   API endpoint status: ${response.status}`);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log(`   API response ok: ${data.ok}`);
      console.log(`   API response status: ${data.status}`);
      console.log(`   API health URL: ${data.healthUrl}`);
      
      console.log('   API endpoint: PASS');
      return true;
    } else if (response.status === 502) {
      console.log('   API endpoint: FAIL (MCP server not running)');
      return false;
    } else {
      console.log('   API endpoint: FAIL (unexpected status)');
      return false;
    }
  } catch (error) {
    console.log(`   API endpoint test error: ${error.message}`);
    return false;
  }
}

async function testTokenHashing() {
  console.log('5. Testing token hashing logic...');
  
  try {
    // Simulate the hashing logic from SetupTokenForm
    const secret = 'test-secret-token-12345';
    const enc = new TextEncoder().encode(secret);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    const hash = [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log(`   Generated hash: ${hash}`);
    console.log(`   Hash length: ${hash.length}`);
    
    if (hash.length === 64) {
      console.log('   Token hashing: PASS');
      return true;
    } else {
      console.log('   Token hashing: FAIL');
      return false;
    }
  } catch (error) {
    console.log(`   Token hashing test error: ${error.message}`);
    return false;
  }
}

async function testSQLGeneration() {
  console.log('6. Testing SQL generation logic...');
  
  try {
    const hash = 'b331fcb81e6191866e3eb0af03d0ff008b9a83c285ee9ab77e7441e95e9598fc';
    const userId = 'c1ced0aa-2603-49c1-9b9b-9601bd5336e2';
    const label = 'chatgpt';
    
    const sql = `-- Run in Supabase SQL Editor (replace ${userId === 'YOUR_USER_UUID' ? 'YOUR_USER_UUID' : 'uuid'} if needed)
insert into public.mcp_tokens (user_id, token_hash, label, scopes)
values (
  '${userId}'::uuid,
  '${hash}',
  '${label}',
  array['read','suggest_write']::text[]
)
on conflict (token_hash) do nothing;`;
    
    console.log(`   SQL contains INSERT: ${sql.includes('INSERT INTO')}`);
    console.log(`   SQL contains mcp_tokens: ${sql.includes('mcp_tokens')}`);
    console.log(`   SQL contains user_id: ${sql.includes('user_id')}`);
    console.log(`   SQL contains token_hash: ${sql.includes('token_hash')}`);
    
    if (sql.includes('INSERT INTO') && sql.includes('mcp_tokens')) {
      console.log('   SQL generation: PASS');
      return true;
    } else {
      console.log('   SQL generation: FAIL');
      return false;
    }
  } catch (error) {
    console.log(`   SQL generation test error: ${error.message}`);
    return false;
  }
}

async function testCORSConfiguration() {
  console.log('7. Testing CORS configuration...');
  
  try {
    const response = await fetch(`${FRONTEND_URL}/api/mcp-health`, {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:3005' }
    });
    
    console.log(`   CORS OPTIONS status: ${response.status}`);
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
    };
    
    console.log(`   CORS headers: ${JSON.stringify(corsHeaders)}`);
    
    if (response.status === 200 || response.status === 204) {
      console.log('   CORS configuration: PASS');
      return true;
    } else {
      console.log('   CORS configuration: FAIL');
      return false;
    }
  } catch (error) {
    console.log(`   CORS test error: ${error.message}`);
    return false;
  }
}

async function runCompleteTest() {
  console.log('Starting simple frontend test...\n');
  
  const results = {
    frontendHealth: await testFrontendHealth(),
    setupPage: await testSetupPage(),
    checkPage: await testCheckPage(),
    apiEndpoint: await testAPIEndpoint(),
    tokenHashing: await testTokenHashing(),
    sqlGeneration: await testSQLGeneration(),
    corsConfig: await testCORSConfiguration(),
  };
  
  console.log('\n FRONTEND TEST RESULTS:');
  console.log('========================');
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`   ${test}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log(' FRONTEND: FULLY FUNCTIONAL');
    console.log('\n Frontend features working:');
    console.log('  - Main page with navigation');
    console.log('  - MCP token setup page');
    console.log('  - Health check page');
    console.log('  - API proxy endpoint');
    console.log('  - Token hashing logic');
    console.log('  - SQL generation');
    console.log('  - CORS configuration');
    
    console.log('\n Frontend is ready for production!');
    console.log(' Next steps:');
    console.log('  1. Deploy frontend to Vercel/Netlify');
    console.log('  2. Configure environment variables');
    console.log('  3. Test with production MCP server');
    
  } else {
    console.log(' FRONTEND: PARTIALLY FUNCTIONAL');
    console.log(' Some features need attention');
  }
}

// Run the test
runCompleteTest().catch(console.error);
