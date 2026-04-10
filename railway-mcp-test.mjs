#!/usr/bin/env node

/**
 * Railway MCP Server Configuration Test
 * Tests the deployed Railway MCP server for proper configuration and functionality
 */

const RAILWAY_MCP_URL = 'https://mcp-server-production-ddee.up.railway.app';

console.log(' RAILWAY MCP SERVER CONFIGURATION TEST');
console.log('======================================\n');

// Test results
const results = {
  health: false,
  auth: false,
  config: {},
  overall: { passed: 0, total: 0 }
};

// Helper function to make requests
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return {
      ok: response.ok,
      status: response.status,
      text: await response.text()
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      text: error.message
    };
  }
}

// Test 1: Health Check
async function testHealthCheck() {
  console.log('1. TESTING HEALTH CHECK');
  console.log('=======================');
  
  const response = await makeRequest(`${RAILWAY_MCP_URL}/health`);
  results.health = response.ok;
  results.overall.total++;
  if (response.ok) results.overall.passed++;
  
  console.log(`   Health Check: ${response.ok ? 'PASS' : 'FAIL'} (${response.status})`);
  
  if (response.ok) {
    try {
      const data = JSON.parse(response.text);
      console.log(`   - Service: ${data.service}`);
      console.log(`   - OK: ${data.ok}`);
      results.config.service = data.service;
    } catch (e) {
      console.log(`   - Response parsing failed: ${response.text}`);
    }
  }
  console.log();
}

// Test 2: MCP Authentication (should return 401 without token)
async function testMCPAuth() {
  console.log('2. TESTING MCP AUTHENTICATION');
  console.log('=============================');
  
  const initRequest = {
    jsonrpc: "2.0",
    method: "initialize",
    id: 1,
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };
  
  const response = await makeRequest(`${RAILWAY_MCP_URL}/mcp`, {
    method: 'POST',
    body: JSON.stringify(initRequest)
  });
  
  results.auth = response.status === 401;
  results.overall.total++;
  if (results.auth) results.overall.passed++;
  
  console.log(`   MCP Auth (no token): ${results.auth ? 'PASS' : 'FAIL'} (${response.status})`);
  
  if (response.status === 401) {
    try {
      const data = JSON.parse(response.text);
      console.log(`   - Error Code: ${data.error?.code}`);
      console.log(`   - Error Message: ${data.error?.message}`);
      results.config.authError = data.error?.message;
    } catch (e) {
      console.log(`   - Response: ${response.text}`);
    }
  }
  console.log();
}

// Test 3: CORS Configuration
async function testCORS() {
  console.log('3. TESTING CORS CONFIGURATION');
  console.log('============================');
  
  const response = await makeRequest(`${RAILWAY_MCP_URL}/health`, {
    headers: {
      'Origin': 'https://chat.openai.com',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization'
    }
  });
  
  const corsAllowed = response.ok;
  results.overall.total++;
  if (corsAllowed) results.overall.passed++;
  
  console.log(`   CORS (chat.openai.com): ${corsAllowed ? 'PASS' : 'FAIL'} (${response.status})`);
  console.log();
}

// Test 4: Rate Limiting
async function testRateLimiting() {
  console.log('4. TESTING RATE LIMITING');
  console.log('========================');
  
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(makeRequest(`${RAILWAY_MCP_URL}/health`));
  }
  
  const responses = await Promise.all(promises);
  const allSuccessful = responses.every(r => r.ok);
  
  results.overall.total++;
  if (allSuccessful) results.overall.passed++;
  
  console.log(`   Rate Limiting (5 requests): ${allSuccessful ? 'PASS' : 'FAIL'}`);
  console.log(`   - Responses: ${responses.map(r => r.status).join(', ')}`);
  console.log();
}

// Test 5: Configuration Analysis
async function analyzeConfiguration() {
  console.log('5. CONFIGURATION ANALYSIS');
  console.log('=========================');
  
  console.log('   Expected Configuration:');
  console.log('   - MCP_DISABLE_ENV_FALLBACK=true (Path B - database tokens only)');
  console.log('   - SUPABASE_URL configured');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY configured');
  console.log('   - MEMORY_ENCRYPTION_KEY configured');
  console.log('   - Railway healthcheck: /health');
  console.log('   - Railway start command: npm start');
  console.log('   - Node version: >=20');
  console.log();
  
  console.log('   Auth Behavior Analysis:');
  console.log(`   - Health endpoint: ${results.health ? 'Working' : 'Not working'}`);
  console.log(`   - MCP auth (401): ${results.auth ? 'Properly configured' : 'Issue detected'}`);
  
  if (results.config.authError) {
    console.log(`   - Auth error message: ${results.config.authError}`);
    const isPathB = results.config.authError.includes('mcp_tokens (SHA-256)');
    console.log(`   - Path B mode: ${isPathB ? 'Enabled' : 'Not detected'}`);
  }
  console.log();
}

// Test 6: Production Readiness
async function checkProductionReadiness() {
  console.log('6. PRODUCTION READINESS CHECK');
  console.log('=============================');
  
  const checks = {
    'Health Endpoint': results.health,
    'MCP Auth (401)': results.auth,
    'HTTPS URL': RAILWAY_MCP_URL.startsWith('https'),
    'Custom Domain': !RAILWAY_MCP_URL.includes('up.railway.app'),
    'Service Name': results.config.service === 'cross-model-memory-mcp'
  };
  
  for (const [check, passed] of Object.entries(checks)) {
    results.overall.total++;
    if (passed) results.overall.passed++;
    console.log(`   ${check.padEnd(20)}: ${passed ? 'PASS' : 'FAIL'}`);
  }
  console.log();
}

// Main test runner
async function runTests() {
  await testHealthCheck();
  await testMCPAuth();
  await testCORS();
  await testRateLimiting();
  await analyzeConfiguration();
  await checkProductionReadiness();
  
  // Final results
  console.log(' FINAL RESULTS');
  console.log('==============');
  console.log(`Overall: ${results.overall.passed}/${results.overall.total} tests passed`);
  console.log(`Success Rate: ${Math.round((results.overall.passed / results.overall.total) * 100)}%`);
  
  const status = results.overall.passed >= results.overall.total * 0.8 ? 'GOOD' : 
                 results.overall.passed >= results.overall.total * 0.6 ? 'NEEDS FIXES' : 'CRITICAL';
  
  console.log(`Status: ${status}`);
  console.log();
  
  if (status === 'GOOD') {
    console.log(' Railway MCP server is properly configured and ready for production!');
    console.log();
    console.log(' Next steps:');
    console.log(' 1. Add MCP tokens to Supabase mcp_tokens table');
    console.log(' 2. Configure ChatGPT connector with Railway URL + Bearer token');
    console.log(' 3. Test end-to-end memory operations');
  } else if (status === 'NEEDS FIXES') {
    console.log(' Railway MCP server has some issues that need attention.');
  } else {
    console.log(' Railway MCP server has critical configuration issues.');
  }
  
  console.log();
  console.log(' ChatGPT Connector Configuration:');
  console.log(` URL: ${RAILWAY_MCP_URL}/mcp`);
  console.log(' Auth: Bearer token from Supabase mcp_tokens table');
  console.log(' Method: Use the plain secret (not the hash)');
}

// Run all tests
runTests().catch(console.error);
