import type { FastifyReply, FastifyRequest } from 'fastify';

/** Developer portal handler */
export async function developersHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const baseUrl = process.env.MCP_PUBLIC_URL || 'https://mcp.velocityconsulting.in';
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Developer Portal - Velocity Consulting MCP</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 40px 0; color: white; }
        .header h1 { font-size: 2.5rem; margin: 0; font-weight: 700; }
        .header p { font-size: 1.2rem; margin: 10px 0 0 0; opacity: 0.9; }
        .content { background: white; border-radius: 12px; padding: 40px; margin: 20px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .section { margin: 30px 0; }
        .section h2 { color: #667eea; font-size: 1.8rem; margin: 0 0 15px 0; }
        .section p { font-size: 1.1rem; line-height: 1.6; margin: 0 0 15px 0; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; }
        .card h3 { color: #667eea; margin: 0 0 10px 0; }
        .code-block { background: #f1f3f4; padding: 15px; border-radius: 6px; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.9rem; margin: 10px 0; overflow-x: auto; }
        .btn { background: #667eea; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; text-decoration: none; display: inline-block; margin: 10px 5px; }
        .btn:hover { background: #5a6fd8; }
        .footer { text-align: center; padding: 40px 0; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Developer Portal</h1>
            <p>Build amazing AI experiences with Velocity Consulting MCP</p>
        </div>

        <div class="content">
            <div class="section">
                <h2>Getting Started</h2>
                <p>Follow these steps to integrate your application with our MCP API:</p>
                <ol>
                    <li><strong>Register Your Client:</strong> Create an OAuth client application</li>
                    <li><strong>Get Authorization:</strong> Implement OAuth 2.0 authorization flow</li>
                    <li><strong>Access API:</strong> Use access tokens to make MCP requests</li>
                    <li><strong>Build Features:</strong> Implement memory and context management</li>
                </ol>
            </div>

            <div class="section">
                <h2>Quick Integration</h2>
                <div class="grid">
                    <div class="card">
                        <h3>ChatGPT Integration</h3>
                        <p>Add your MCP server to ChatGPT for seamless AI conversations with memory.</p>
                        <div class="code-block">
MCP Server URL: ${baseUrl}
Authentication: OAuth
                        </div>
                        <button class="btn" onclick="window.open('${baseUrl}/docs', '_blank')">View API Docs</button>
                    </div>
                    <div class="card">
                        <h3>Custom Application</h3>
                        <p>Integrate MCP into your own applications using our OAuth API.</p>
                        <div class="code-block">
// Example: Register client
POST ${baseUrl}/oauth/register
{
  "client_name": "My App",
  "redirect_uris": ["https://myapp.com/callback"]
}
                        </div>
                        <button class="btn" onclick="window.open('${baseUrl}/docs', '_blank')">API Reference</button>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>SDKs & Libraries</h2>
                <div class="grid">
                    <div class="card">
                        <h3>JavaScript/Node.js</h3>
                        <p>Official JavaScript SDK for MCP integration.</p>
                        <div class="code-block">
npm install @velocityconsulting/mcp-sdk
                        </div>
                        <button class="btn">Coming Soon</button>
                    </div>
                    <div class="card">
                        <h3>Python</h3>
                        <p>Python SDK for MCP API integration.</p>
                        <div class="code-block">
pip install velocity-mcp-python
                        </div>
                        <button class="btn">Coming Soon</button>
                    </div>
                    <div class="card">
                        <h3>REST API</h3>
                        <p>Use any language with our REST API endpoints.</p>
                        <div class="code-block">
curl -X POST ${baseUrl}/oauth/register \\
  -H "Content-Type: application/json" \\
  -d '{"client_name": "My App"}'
                        </div>
                        <button class="btn" onclick="window.open('${baseUrl}/docs', '_blank')">Try API</button>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Code Examples</h2>
                <div class="card">
                    <h3>Complete OAuth Flow Example</h3>
                    <div class="code-block">
// 1. Register client
const registerResponse = await fetch('${baseUrl}/oauth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_name: 'My App',
    redirect_uris: ['https://myapp.com/callback'],
    scopes: ['read', 'write']
  })
});

const { client_id, client_secret } = await registerResponse.json();

// 2. Get authorization URL
const authUrl = '${baseUrl}/oauth/authorize?' +
  'response_type=code&' +
  'client_id=' + client_id + '&' +
  'redirect_uri=' + encodeURIComponent('https://myapp.com/callback') + '&' +
  'scope=read write&' +
  'state=' + generateRandomString();

// 3. Exchange code for token
const tokenResponse = await fetch('${baseUrl}/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    client_id: client_id,
    client_secret: client_secret,
    redirect_uri: 'https://myapp.com/callback'
  })
});

const { access_token } = await tokenResponse.json();

// 4. Make MCP requests
const mcpResponse = await fetch('${baseUrl}/mcp', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + access_token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'store_experience',
      arguments: { content: 'User experience data' }
    },
    id: 1
  })
});
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Support & Resources</h2>
                <div class="grid">
                    <div class="card">
                        <h3>Documentation</h3>
                        <p>Complete API documentation and guides.</p>
                        <button class="btn" onclick="window.open('${baseUrl}/docs', '_blank')">View Docs</button>
                    </div>
                    <div class="card">
                        <h3>GitHub Repository</h3>
                        <p>View source code and examples.</p>
                        <button class="btn" onclick="window.open('https://github.com/Saiteja02806/memforme', '_blank')">View on GitHub</button>
                    </div>
                    <div class="card">
                        <h3>Support</h3>
                        <p>Get help with integration and issues.</p>
                        <button class="btn">Contact Support</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>&copy; 2024 Velocity Consulting. Built with MCP and OAuth 2.0.</p>
        </div>
    </div>
</body>
</html>
  `;

  return reply.type('text/html').send(html);
}
