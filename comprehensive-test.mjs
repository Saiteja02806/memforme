#!/usr/bin/env node

/**
 * Comprehensive Frontend Testing
 * Tests all aspects of the running frontend
 */

const FRONTEND_URL = 'http://localhost:3007';
const MCP_SERVER_URL = 'http://127.0.0.1:3000';

console.log(' COMPREHENSIVE FRONTEND TESTING');
console.log('================================\n');

// Test results
const results = {
  pages: {},
  api: {},
  functionality: {},
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

// Test 1: Main Pages
async function testMainPages() {
  console.log('1. TESTING MAIN PAGES');
  console.log('====================');
  
  const pages = [
    { path: '/', name: 'Home' },
    { path: '/setup', name: 'Setup' },
    { path: '/check', name: 'Health Check' },
    { path: '/signup', name: 'Signup' },
    { path: '/login', name: 'Login' }
  ];
  
  for (const page of pages) {
    const response = await makeRequest(`${FRONTEND_URL}${page.path}`);
    results.pages[page.name] = response.ok;
    results.overall.total++;
    if (response.ok) results.overall.passed++;
    
    console.log(`   ${page.name.padEnd(12)}: ${response.status === 200 ? 'PASS' : 'FAIL'} (${response.status})`);
  }
  console.log();
}

// Test 2: API Endpoints
async function testAPIEndpoints() {
  console.log('2. TESTING API ENDPOINTS');
  console.log('========================');
  
  // Test health check API
  const healthResponse = await makeRequest(`${FRONTEND_URL}/api/mcp-health`, {
    method: 'POST',
    body: JSON.stringify({ baseUrl: MCP_SERVER_URL })
  });
  
  results.api.healthCheck = healthResponse.ok;
  results.overall.total++;
  if (healthResponse.ok) results.overall.passed++;
  
  console.log(`   Health Check API: ${healthResponse.ok ? 'PASS' : 'FAIL'} (${healthResponse.status})`);
  if (healthResponse.ok) {
    try {
      const data = JSON.parse(healthResponse.text);
      console.log(`   - Server OK: ${data.ok}`);
      console.log(`   - Status: ${data.status}`);
      console.log(`   - Service: ${data.body?.service}`);
    } catch (e) {
      console.log(`   - Response parsing failed`);
    }
  }
  console.log();
}

// Test 3: MCP Server Direct
async function testMCPServer() {
  console.log('3. TESTING MCP SERVER');
  console.log('=====================');
  
  const response = await makeRequest(`${MCP_SERVER_URL}/health`);
  results.functionality.mcpServer = response.ok;
  results.overall.total++;
  if (response.ok) results.overall.passed++;
  
  console.log(`   MCP Server: ${response.ok ? 'PASS' : 'FAIL'} (${response.status})`);
  if (response.ok) {
    try {
      const data = JSON.parse(response.text);
      console.log(`   - Service: ${data.service}`);
      console.log(`   - OK: ${data.ok}`);
    } catch (e) {
      console.log(`   - Response parsing failed`);
    }
  }
  console.log();
}

// Test 4: Error Handling
async function testErrorHandling() {
  console.log('4. TESTING ERROR HANDLING');
  console.log('========================');
  
  // Test 404
  const notFoundResponse = await makeRequest(`${FRONTEND_URL}/nonexistent-page`);
  results.functionality.notFound = notFoundResponse.status === 404;
  results.overall.total++;
  if (results.functionality.notFound) results.overall.passed++;
  
  console.log(`   404 Page: ${results.functionality.notFound ? 'PASS' : 'FAIL'} (${notFoundResponse.status})`);
  
  // Test API error
  const apiError = await makeRequest(`${FRONTEND_URL}/api/mcp-health`, {
    method: 'POST',
    body: JSON.stringify({ baseUrl: 'invalid-url' })
  });
  results.functionality.apiError = !apiError.ok;
  results.overall.total++;
  if (results.functionality.apiError) results.overall.passed++;
  
  console.log(`   API Error: ${results.functionality.apiError ? 'PASS' : 'FAIL'} (${apiError.status})`);
  console.log();
}

// Test 5: Content Analysis
async function testContent() {
  console.log('5. TESTING CONTENT');
  console.log('==================');
  
  const homeResponse = await makeRequest(`${FRONTEND_URL}/`);
  const content = homeResponse.text.toLowerCase();
  
  const checks = {
    'Has Title': content.includes('memforme'),
    'Has Description': content.includes('cross-model memory'),
    'Has Signup Link': content.includes('signup'),
    'Has Login Link': content.includes('login'),
    'Has Setup Link': content.includes('setup'),
    'Has Documentation': content.includes('docs')
  };
  
  for (const [check, passed] of Object.entries(checks)) {
    results.functionality[check] = passed;
    results.overall.total++;
    if (passed) results.overall.passed++;
    console.log(`   ${check.padEnd(20)}: ${passed ? 'PASS' : 'FAIL'}`);
  }
  console.log();
}

// Main test runner
async function runTests() {
  await testMainPages();
  await testAPIEndpoints();
  await testMCPServer();
  await testErrorHandling();
  await testContent();
  
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
    console.log(' Frontend is ready for user testing!');
  } else if (status === 'NEEDS FIXES') {
    console.log(' Frontend is functional but needs some improvements.');
  } else {
    console.log(' Frontend has critical issues that need immediate attention.');
  }
}

// Run all tests
runTests().catch(console.error);
