#!/usr/bin/env node

/**
 * Railway Environment Variables Check
 * Shows what environment variables should be set on Railway
 */

console.log(' RAILWAY ENVIRONMENT VARIABLES CHECK');
console.log('===================================\n');

console.log('Required Environment Variables for Railway (Path B - Production):');
console.log('================================================================\n');

const envVars = [
  {
    name: 'SUPABASE_URL',
    required: true,
    description: 'Your Supabase project URL',
    example: 'https://your-project.supabase.co',
    source: 'Supabase Dashboard -> Settings -> API'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key (bypasses RLS)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    source: 'Supabase Dashboard -> Settings -> API'
  },
  {
    name: 'MEMORY_ENCRYPTION_KEY',
    required: true,
    description: '64 hex chars (32 bytes) for AES-256-GCM encryption',
    example: '803d66de1d610fa065d50a210e20889164ebaef556824a07c7e00f3e5fb5eba0',
    source: 'Generate with: openssl rand -hex 32'
  },
  {
    name: 'MCP_DISABLE_ENV_FALLBACK',
    required: true,
    description: 'Force Path B (database tokens only)',
    example: 'true',
    source: 'Set to "true" for production security'
  }
];

const optionalVars = [
  {
    name: 'MCP_EXTRA_CORS_ORIGINS',
    required: false,
    description: 'Additional CORS origins beyond defaults',
    example: 'https://chat.openai.com,https://your-app.com',
    source: 'Add if browser clients need CORS'
  },
  {
    name: 'MCP_RATE_LIMIT_MAX',
    required: false,
    description: 'Max requests per time window',
    example: '400',
    source: 'Default: 400, adjust as needed'
  },
  {
    name: 'MCP_RATE_LIMIT_WINDOW',
    required: false,
    description: 'Rate limit time window',
    example: '1 minute',
    source: 'Default: "1 minute"'
  },
  {
    name: 'MCP_BODY_LIMIT_BYTES',
    required: false,
    description: 'Max request body size',
    example: '524288',
    source: 'Default: 512KB (512 * 1024)'
  }
];

console.log('REQUIRED VARIABLES:\n');
envVars.forEach((envVar, index) => {
  console.log(`${index + 1}. ${envVar.name}`);
  console.log(`   Required: ${envVar.required ? 'YES' : 'NO'}`);
  console.log(`   Description: ${envVar.description}`);
  console.log(`   Example: ${envVar.example}`);
  console.log(`   Source: ${envVar.source}`);
  console.log();
});

console.log('OPTIONAL VARIABLES:\n');
optionalVars.forEach((envVar, index) => {
  console.log(`${index + 1}. ${envVar.name}`);
  console.log(`   Required: ${envVar.required ? 'YES' : 'NO'}`);
  console.log(`   Description: ${envVar.description}`);
  console.log(`   Example: ${envVar.example}`);
  console.log(`   Source: ${envVar.source}`);
  console.log();
});

console.log('VARIABLES TO AVOID:\n');
console.log('1. MCP_BEARER_TOKEN');
console.log('   - Should be omitted in production (Path B)');
console.log('   - Only use for local development\n');

console.log('2. SUPABASE_FALLBACK_USER_ID');
console.log('   - Should be omitted in production (Path B)');
console.log('   - Only use for local development\n');

console.log('3. PORT');
console.log('   - Railway sets this automatically');
console.log('   - Do not set manually on Railway\n');

console.log('RAILWAY DEPLOYMENT CONFIGURATION:\n');
console.log('From railway.toml:');
console.log('- Build Command: npm install && npm run build');
console.log('- Start Command: npm start');
console.log('- Health Check Path: /health');
console.log('- Root Directory: mcp-server');
console.log('- Node Version: >=20\n');

console.log('CURRENT LOCAL .ENV ANALYSIS:\n');
console.log('Checking local mcp-server/.env...');

try {
  const fs = await import('fs');
  const path = await import('path');
  const envPath = path.join(process.cwd(), 'mcp-server', '.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    console.log('Found variables:');
    lines.forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        const isSecret = key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET');
        const displayValue = isSecret ? '[REDACTED]' : value;
        console.log(`   ${key}: ${displayValue}`);
      }
    });
  } else {
    console.log('No .env file found in mcp-server directory');
  }
} catch (error) {
  console.log('Could not read .env file');
}

console.log('\nDEPLOYMENT CHECKLIST:\n');
console.log('1. Set all required variables in Railway dashboard');
console.log('2. Verify MCP_DISABLE_ENV_FALLBACK=true');
console.log('3. Ensure SUPABASE_SERVICE_ROLE_KEY is correct (not anon key)');
console.log('4. Test health endpoint after deployment');
console.log('5. Test MCP endpoint returns 401 without token');
console.log('6. Add MCP tokens to Supabase mcp_tokens table');
console.log('7. Configure ChatGPT connector with Railway URL');
