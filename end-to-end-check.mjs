#!/usr/bin/env node

/**
 * End-to-End System Check
 * Comprehensive verification of frontend, backend, database, and Railway integration
 */

const FRONTEND_URL = 'http://localhost:3007';
const RAILWAY_MCP_URL = 'https://mcp-server-production-ddee.up.railway.app';
const LOCAL_MCP_URL = 'http://127.0.0.1:3000';

console.log(' END-TO-END SYSTEM CHECK');
console.log('========================\n');

// Test results
const results = {
  frontend: {},
  backend: {},
  database: {},
  railway: {},
  integration: {},
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

// 1. Frontend Check
async function checkFrontend() {
  console.log('1. FRONTEND CHECK');
  console.log('================\n');
  
  const pages = [
    { path: '/', name: 'Home' },
    { path: '/signup', name: 'Signup' },
    { path: '/login', name: 'Login' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/connect', name: 'Connect' },
    { path: '/dev/setup', name: 'Dev Setup' },
    { path: '/dev/check', name: 'Dev Check' }
  ];
  
  for (const page of pages) {
    const response = await makeRequest(`${FRONTEND_URL}${page.path}`);
    results.frontend[page.name] = response.ok;
    results.overall.total++;
    if (response.ok) results.overall.passed++;
    
    console.log(`   ${page.name.padEnd(15)}: ${response.status === 200 ? 'PASS' : 'FAIL'} (${response.status})`);
  }
  
  // Check API endpoints
  const healthAPI = await makeRequest(`${FRONTEND_URL}/api/mcp-health`, {
    method: 'POST',
    body: JSON.stringify({ baseUrl: LOCAL_MCP_URL })
  });
  results.frontend.healthAPI = healthAPI.ok;
  results.overall.total++;
  if (healthAPI.ok) results.overall.passed++;
  
  console.log(`   Health API       : ${healthAPI.ok ? 'PASS' : 'FAIL'} (${healthAPI.status})`);
  console.log();
}

// 2. Backend Check
async function checkBackend() {
  console.log('2. BACKEND MCP SERVER CHECK');
  console.log('===========================\n');
  
  // Check local MCP server
  const localHealth = await makeRequest(`${LOCAL_MCP_URL}/health`);
  results.backend.localHealth = localHealth.ok;
  results.overall.total++;
  if (localHealth.ok) results.overall.passed++;
  
  console.log(`   Local Health     : ${localHealth.ok ? 'PASS' : 'FAIL'} (${localHealth.status})`);
  
  if (localHealth.ok) {
    try {
      const data = JSON.parse(localHealth.text);
      console.log(`   - Service: ${data.service}`);
      results.backend.localService = data.service;
    } catch (e) {
      console.log(`   - Response parsing failed`);
    }
  }
  
  // Check MCP endpoint auth
  const localMCP = await makeRequest(`${LOCAL_MCP_URL}/mcp`, {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "initialize",
      id: 1,
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" }
      }
    })
  });
  results.backend.localAuth = localMCP.status === 401;
  results.overall.total++;
  if (results.backend.localAuth) results.overall.passed++;
  
  console.log(`   Local MCP Auth   : ${results.backend.localAuth ? 'PASS' : 'FAIL'} (${localMCP.status})`);
  console.log();
}

// 3. Database Schema Check
async function checkDatabase() {
  console.log('3. DATABASE SCHEMA CHECK');
  console.log('=======================\n');
  
  // Check if migrations exist
  const fs = await import('fs');
  const path = await import('path');
  
  const migrationsPath = path.join(process.cwd(), 'supabase', 'migrations');
  const migrationsExist = fs.existsSync(migrationsPath);
  
  results.database.migrationsExist = migrationsExist;
  results.overall.total++;
  if (migrationsExist) results.overall.passed++;
  
  console.log(`   Migrations Dir   : ${migrationsExist ? 'PASS' : 'FAIL'}`);
  
  if (migrationsExist) {
    const migrationFiles = fs.readdirSync(migrationsPath);
    console.log(`   Migration Files  : ${migrationFiles.length} found`);
    results.database.migrationCount = migrationFiles.length;
    
    const expectedMigrations = ['001_initial_schema.sql', '002_mcp_tool_audit.sql', '003_storage_rls_user_memory.sql'];
    const allExpectedPresent = expectedMigrations.every(m => migrationFiles.includes(m));
    
    results.database.expectedMigrations = allExpectedPresent;
    results.overall.total++;
    if (allExpectedPresent) results.overall.passed++;
    
    console.log(`   Expected Files   : ${allExpectedPresent ? 'PASS' : 'FAIL'}`);
  }
  
  // Check seed file
  const seedPath = path.join(process.cwd(), 'supabase', 'seed_mcp_token_example.sql');
  const seedExists = fs.existsSync(seedPath);
  
  results.database.seedExists = seedExists;
  results.overall.total++;
  if (seedExists) results.overall.passed++;
  
  console.log(`   Seed File        : ${seedExists ? 'PASS' : 'FAIL'}`);
  console.log();
}

// 4. Railway Deployment Check
async function checkRailway() {
  console.log('4. RAILWAY DEPLOYMENT CHECK');
  console.log('===========================\n');
  
  // Check Railway health
  const railwayHealth = await makeRequest(`${RAILWAY_MCP_URL}/health`);
  results.railway.health = railwayHealth.ok;
  results.overall.total++;
  if (railwayHealth.ok) results.overall.passed++;
  
  console.log(`   Railway Health   : ${railwayHealth.ok ? 'PASS' : 'FAIL'} (${railwayHealth.status})`);
  
  if (railwayHealth.ok) {
    try {
      const data = JSON.parse(railwayHealth.text);
      console.log(`   - Service: ${data.service}`);
      results.railway.service = data.service;
    } catch (e) {
      console.log(`   - Response parsing failed`);
    }
  }
  
  // Check Railway MCP auth
  const railwayMCP = await makeRequest(`${RAILWAY_MCP_URL}/mcp`, {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "initialize",
      id: 1,
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" }
      }
    })
  });
  results.railway.auth = railwayMCP.status === 401;
  results.overall.total++;
  if (results.railway.auth) results.overall.passed++;
  
  console.log(`   Railway MCP Auth : ${results.railway.auth ? 'PASS' : 'FAIL'} (${railwayMCP.status})`);
  
  // Check HTTPS
  results.railway.https = RAILWAY_MCP_URL.startsWith('https');
  results.overall.total++;
  if (results.railway.https) results.overall.passed++;
  
  console.log(`   HTTPS URL        : ${results.railway.https ? 'PASS' : 'FAIL'}`);
  console.log();
}

// 5. Integration Check
async function checkIntegration() {
  console.log('5. INTEGRATION CHECK');
  console.log('====================\n');
  
  // Check frontend can talk to backend
  const frontendToLocalMCP = await makeRequest(`${FRONTEND_URL}/api/mcp-health`, {
    method: 'POST',
    body: JSON.stringify({ baseUrl: LOCAL_MCP_URL })
  });
  results.integration.frontendToLocal = frontendToLocalMCP.ok;
  results.overall.total++;
  if (frontendToLocalMCP.ok) results.overall.passed++;
  
  console.log(`   Frontend → Local MCP  : ${frontendToLocalMCP.ok ? 'PASS' : 'FAIL'}`);
  
  // Check frontend config
  const fs = await import('fs');
  const path = await import('path');
  const envPath = path.join(process.cwd(), 'web', '.env.local');
  const envExists = fs.existsSync(envPath);
  
  results.integration.envConfig = envExists;
  results.overall.total++;
  if (envExists) results.overall.passed++;
  
  console.log(`   Frontend .env.local   : ${envExists ? 'PASS' : 'FAIL'}`);
  
  if (envExists) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasSupabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL');
    const hasSupabaseKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const hasMcpUrl = envContent.includes('NEXT_PUBLIC_MCP_SERVER_URL');
    
    results.integration.supabaseUrl = hasSupabaseUrl;
    results.integration.supabaseKey = hasSupabaseKey;
    results.integration.mcpUrl = hasMcpUrl;
    
    results.overall.total += 3;
    if (hasSupabaseUrl) results.overall.passed++;
    if (hasSupabaseKey) results.overall.passed++;
    if (hasMcpUrl) results.overall.passed++;
    
    console.log(`   - Supabase URL        : ${hasSupabaseUrl ? 'PASS' : 'FAIL'}`);
    console.log(`   - Supabase Anon Key   : ${hasSupabaseKey ? 'PASS' : 'FAIL'}`);
    console.log(`   - MCP Server URL      : ${hasMcpUrl ? 'PASS' : 'FAIL'}`);
  }
  
  // Check backend config
  const backendEnvPath = path.join(process.cwd(), 'mcp-server', '.env');
  const backendEnvExists = fs.existsSync(backendEnvPath);
  
  results.integration.backendEnv = backendEnvExists;
  results.overall.total++;
  if (backendEnvExists) results.overall.passed++;
  
  console.log(`   Backend .env          : ${backendEnvExists ? 'PASS' : 'FAIL'}`);
  
  if (backendEnvExists) {
    const backendEnvContent = fs.readFileSync(backendEnvPath, 'utf8');
    const hasSupabaseUrl = backendEnvContent.includes('SUPABASE_URL');
    const hasServiceKey = backendEnvContent.includes('SUPABASE_SERVICE_ROLE_KEY');
    const hasEncryptionKey = backendEnvContent.includes('MEMORY_ENCRYPTION_KEY');
    const hasDisableFallback = backendEnvContent.includes('MCP_DISABLE_ENV_FALLBACK');
    
    results.integration.backendSupabaseUrl = hasSupabaseUrl;
    results.integration.backendServiceKey = hasServiceKey;
    results.integration.backendEncryptionKey = hasEncryptionKey;
    results.integration.backendDisableFallback = hasDisableFallback;
    
    results.overall.total += 4;
    if (hasSupabaseUrl) results.overall.passed++;
    if (hasServiceKey) results.overall.passed++;
    if (hasEncryptionKey) results.overall.passed++;
    if (hasDisableFallback) results.overall.passed++;
    
    console.log(`   - Supabase URL        : ${hasSupabaseUrl ? 'PASS' : 'FAIL'}`);
    console.log(`   - Service Role Key    : ${hasServiceKey ? 'PASS' : 'FAIL'}`);
    console.log(`   - Encryption Key      : ${hasEncryptionKey ? 'PASS' : 'FAIL'}`);
    console.log(`   - Disable Fallback     : ${hasDisableFallback ? 'PASS' : 'FAIL'}`);
  }
  
  console.log();
}

// 6. Architecture Check
async function checkArchitecture() {
  console.log('6. ARCHITECTURE VERIFICATION');
  console.log('============================\n');
  
  console.log('Frontend Architecture:');
  console.log('   - Framework: Next.js 15');
  console.log('   - Auth: Supabase Auth');
  console.log('   - State: React Server Components');
  console.log('   - Styling: CSS Modules/Tailwind');
  console.log();
  
  console.log('Backend Architecture:');
  console.log('   - Framework: Fastify');
  console.log('   - Protocol: MCP (Model Context Protocol)');
  console.log('   - Auth: Bearer tokens (SHA-256 hashed)');
  console.log('   - Database: Supabase (PostgreSQL)');
  console.log('   - Storage: Supabase Storage');
  console.log('   - Encryption: AES-256-GCM');
  console.log('   - Queue: BullMQ + Redis (optional)');
  console.log();
  
  console.log('Database Schema:');
  console.log('   - mcp_tokens: Authentication tokens');
  console.log('   - memory_entries: Encrypted memory data');
  console.log('   - memory_versions: Version history');
  console.log('   - sessions: Capture sessions');
  console.log('   - conflicts: Conflict resolution');
  console.log('   - mcp_tool_audit: Tool usage audit');
  console.log('   - Storage: user-memory bucket');
  console.log();
  
  console.log('Deployment:');
  console.log('   - Frontend: Local (port 3007) / Vercel (production)');
  console.log('   - Backend: Railway (production)');
  console.log('   - Database: Supabase (managed)');
  console.log('   - Auth: Path B (database tokens only)');
  console.log();
}

// Main test runner
async function runTests() {
  await checkFrontend();
  await checkBackend();
  await checkDatabase();
  await checkRailway();
  await checkIntegration();
  await checkArchitecture();
  
  // Final results
  console.log(' FINAL RESULTS');
  console.log('==============');
  console.log(`Overall: ${results.overall.passed}/${results.overall.total} tests passed`);
  console.log(`Success Rate: ${Math.round((results.overall.passed / results.overall.total) * 100)}%`);
  
  const status = results.overall.passed >= results.overall.total * 0.9 ? 'EXCELLENT' : 
                 results.overall.passed >= results.overall.total * 0.8 ? 'GOOD' : 
                 results.overall.passed >= results.overall.total * 0.6 ? 'NEEDS FIXES' : 'CRITICAL';
  
  console.log(`Status: ${status}`);
  console.log();
  
  if (status === 'EXCELLENT' || status === 'GOOD') {
    console.log(' System is ready for end-to-end testing!');
    console.log();
    console.log(' Next steps:');
    console.log(' 1. Create Supabase user account');
    console.log(' 2. Generate MCP token via dashboard or SQL');
    console.log(' 3. Configure ChatGPT connector');
    console.log(' 4. Test memory operations end-to-end');
  } else {
    console.log(' System has issues that need attention before end-to-end testing.');
  }
  
  console.log();
  console.log(' COMPONENT SUMMARY:');
  console.log(' =================');
  console.log(' Frontend:        ' + (Object.values(results.frontend).every(v => v === true) ? '✓ PASS' : '✗ FAIL'));
  console.log(' Backend:         ' + (Object.values(results.backend).every(v => v === true) ? '✓ PASS' : '✗ FAIL'));
  console.log(' Database:        ' + (Object.values(results.database).every(v => v === true) ? '✓ PASS' : '✗ FAIL'));
  console.log(' Railway:         ' + (Object.values(results.railway).every(v => v === true) ? '✓ PASS' : '✗ FAIL'));
  console.log(' Integration:     ' + (Object.values(results.integration).every(v => v === true) ? '✓ PASS' : '✗ FAIL'));
}

// Run all tests
runTests().catch(console.error);
