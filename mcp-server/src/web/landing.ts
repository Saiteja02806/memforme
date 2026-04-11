import type { FastifyReply, FastifyRequest } from 'fastify';

/** Landing page handler for the brand subdomain */
export async function landingPageHandler(
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
    <title>Velocity Consulting - MCP Server</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            padding: 40px 0;
            color: white;
        }
        .header h1 {
            font-size: 2.5rem;
            margin: 0;
            font-weight: 700;
        }
        .header p {
            font-size: 1.2rem;
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .content {
            background: white;
            border-radius: 12px;
            padding: 40px;
            margin: 20px 0;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .section {
            margin: 30px 0;
        }
        .section h2 {
            color: #667eea;
            font-size: 1.8rem;
            margin: 0 0 15px 0;
        }
        .section p {
            font-size: 1.1rem;
            line-height: 1.6;
            margin: 0 0 15px 0;
        }
        .endpoints {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .endpoint {
            margin: 10px 0;
            padding: 15px;
            background: white;
            border-radius: 6px;
            border-left: 4px solid #667eea;
        }
        .endpoint code {
            background: #f1f3f4;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
        }
        .method {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
            margin-right: 8px;
        }
        .method.get { background: #e3f2fd; color: #1976d2; }
        .method.post { background: #e8f5e8; color: #2e7d32; }
        .status {
            background: #e8f5e8;
            color: #2e7d32;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            display: inline-block;
        }
        .footer {
            text-align: center;
            padding: 40px 0;
            color: white;
        }
        .btn {
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            text-decoration: none;
            display: inline-block;
            margin: 10px 5px;
        }
        .btn:hover {
            background: #5a6fd8;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Velocity Consulting MCP Server</h1>
            <p>Model Context Protocol (MCP) OAuth 2.0 API</p>
            <div class="status">API Status: Online</div>
        </div>

        <div class="content">
            <div class="section">
                <h2>Welcome to the MCP API</h2>
                <p>This server provides OAuth 2.0 authentication for the Model Context Protocol (MCP). Use the endpoints below to integrate with ChatGPT and other MCP-compatible applications.</p>
            </div>

            <div class="section">
                <h2>OAuth Endpoints</h2>
                <div class="endpoints">
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <code>${baseUrl}/.well-known/oauth-authorization-server</code>
                        <p>OAuth discovery endpoint - returns server metadata</p>
                    </div>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <code>${baseUrl}/oauth/register</code>
                        <p>Register new OAuth client applications</p>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <code>${baseUrl}/oauth/authorize</code>
                        <p>OAuth authorization endpoint - redirects users for consent</p>
                    </div>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <code>${baseUrl}/oauth/token</code>
                        <p>Exchange authorization codes for access tokens</p>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <code>${baseUrl}/oauth/userinfo</code>
                        <p>Get user information with access token</p>
                    </div>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <code>${baseUrl}/mcp</code>
                        <p>MCP server endpoint - requires OAuth access token</p>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Quick Start</h2>
                <div class="grid">
                    <div class="card">
                        <h3>1. Discover OAuth</h3>
                        <p>Check the OAuth discovery endpoint to see server configuration:</p>
                        <button class="btn" onclick="window.open('${baseUrl}/.well-known/oauth-authorization-server', '_blank')">Test Discovery</button>
                    </div>
                    <div class="card">
                        <h3>2. Register Client</h3>
                        <p>Register your application to get OAuth credentials:</p>
                        <button class="btn" onclick="testRegistration()">Test Registration</button>
                    </div>
                    <div class="card">
                        <h3>3. Check Health</h3>
                        <p>Verify the server is running and healthy:</p>
                        <button class="btn" onclick="window.open('${baseUrl}/health', '_blank')">Check Health</button>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>OAuth Flow</h2>
                <p>Follow these steps to integrate with ChatGPT:</p>
                <ol>
                    <li><strong>Register Client:</strong> Use the registration endpoint to create your OAuth client</li>
                    <li><strong>Get Authorization:</strong> Redirect users to the authorization endpoint</li>
                    <li><strong>Exchange Code:</strong> Exchange the authorization code for an access token</li>
                    <li><strong>Access API:</strong> Use the access token to make MCP requests</li>
                </ol>
            </div>

            <div class="section">
                <h2>Technical Details</h2>
                <ul>
                    <li><strong>Grant Type:</strong> Authorization Code</li>
                    <li><strong>Token Type:</strong> Bearer</li>
                    <li><strong>Token Expiration:</strong> 1 hour</li>
                    <li><strong>Scopes:</strong> read, write, mcp</li>
                    <li><strong>Authentication:</strong> OAuth 2.0 Bearer tokens</li>
                </ul>
            </div>
        </div>

        <div class="footer">
            <p>&copy; 2024 Velocity Consulting. Built with MCP and OAuth 2.0.</p>
        </div>
    </div>

    <script>
        async function testRegistration() {
            try {
                const response = await fetch('${baseUrl}/oauth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        client_name: 'Test Client',
                        client_uri: 'https://example.com',
                        redirect_uris: ['https://chatgpt.com'],
                        scopes: ['read', 'write']
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert('Registration successful!\\n\\nClient ID: ' + data.client_id + '\\nClient Secret: ' + data.client_secret);
                } else {
                    alert('Registration failed: ' + data.error_description);
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }
    </script>
</body>
</html>
  `;

  return reply.type('text/html').send(html);
}

/** Health check endpoint */
export async function healthCheckHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  return reply.send({
    ok: true,
    service: 'cross-model-memory-mcp',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      oauth_discovery: '/.well-known/oauth-authorization-server',
      oauth_register: '/oauth/register',
      oauth_authorize: '/oauth/authorize',
      oauth_token: '/oauth/token',
      oauth_userinfo: '/oauth/userinfo',
      mcp_server: '/mcp'
    }
  });
}
