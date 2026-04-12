import type { FastifyReply, FastifyRequest } from 'fastify';

/** API documentation handler */
export async function docsHandler(
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
    <title>API Documentation - Velocity Consulting MCP</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.0/swagger-ui.min.css">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .swagger-ui { max-width: 1200px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Velocity Consulting MCP API</h1>
        <p>Interactive API Documentation</p>
    </div>
    
    <div id="swagger-ui"></div>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui-bundle/4.15.0/swagger-ui-bundle.min.js"></script>
    <script>
        window.onload = function() {
            const spec = {
                "openapi": "3.0.0",
                "info": {
                    "title": "Velocity Consulting MCP API",
                    "version": "1.0.0",
                    "description": "Model Context Protocol (MCP) OAuth 2.0 API"
                },
                "servers": [
                    { "url": "${baseUrl}", "description": "Production Server" }
                ],
                "paths": {
                    "/.well-known/oauth-authorization-server": {
                        "get": {
                            "summary": "OAuth Discovery",
                            "description": "Get OAuth server metadata",
                            "responses": {
                                "200": { "description": "OAuth server metadata" }
                            }
                        }
                    },
                    "/oauth/register": {
                        "post": {
                            "summary": "Register OAuth Client",
                            "description": "Register a new OAuth client application",
                            "requestBody": {
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "client_name": { "type": "string" },
                                                "client_uri": { "type": "string" },
                                                "redirect_uris": { "type": "array", "items": { "type": "string" } },
                                                "scopes": { "type": "array", "items": { "type": "string" } }
                                            }
                                        }
                                    }
                                }
                            },
                            "responses": {
                                "200": { "description": "Client registered successfully" }
                            }
                        }
                    },
                    "/oauth/authorize": {
                        "get": {
                            "summary": "OAuth Authorization",
                            "description": "OAuth authorization endpoint",
                            "parameters": [
                                { "name": "response_type", "in": "query", "required": true, "schema": { "type": "string" } },
                                { "name": "client_id", "in": "query", "required": true, "schema": { "type": "string" } },
                                { "name": "redirect_uri", "in": "query", "required": true, "schema": { "type": "string" } },
                                { "name": "scope", "in": "query", "schema": { "type": "string" } },
                                { "name": "state", "in": "query", "schema": { "type": "string" } }
                            ],
                            "responses": {
                                "302": { "description": "Redirect to client" }
                            }
                        }
                    },
                    "/oauth/token": {
                        "post": {
                            "summary": "Exchange Authorization Code",
                            "description": "Exchange authorization code for access token",
                            "requestBody": {
                                "content": {
                                    "application/x-www-form-urlencoded": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "grant_type": { "type": "string", "enum": ["authorization_code"] },
                                                "code": { "type": "string" },
                                                "client_id": { "type": "string" },
                                                "client_secret": { "type": "string" },
                                                "redirect_uri": { "type": "string" }
                                            }
                                        }
                                    }
                                }
                            },
                            "responses": {
                                "200": { "description": "Access token granted" }
                            }
                        }
                    },
                    "/oauth/userinfo": {
                        "get": {
                            "summary": "Get User Information",
                            "description": "Get user information with access token",
                            "security": [{ "BearerAuth": [] }],
                            "responses": {
                                "200": { "description": "User information" },
                                "401": { "description": "Unauthorized" }
                            }
                        }
                    },
                    "/mcp": {
                        "post": {
                            "summary": "MCP Server Endpoint",
                            "description": "Model Context Protocol server endpoint",
                            "security": [{ "BearerAuth": [] }],
                            "responses": {
                                "200": { "description": "MCP response" },
                                "401": { "description": "Unauthorized" }
                            }
                        }
                    },
                    "/health": {
                        "get": {
                            "summary": "Health Check",
                            "description": "Check server health status",
                            "responses": {
                                "200": { "description": "Server is healthy" }
                            }
                        }
                    }
                },
                "components": {
                    "securitySchemes": {
                        "BearerAuth": {
                            "type": "http",
                            "scheme": "bearer",
                            "bearerFormat": "JWT"
                        }
                    }
                }
            };
            
            SwaggerUIBundle({
                url: '',
                spec: spec,
                dom_id: '#swagger-ui',
                presets: [SwaggerUIBundle.presets.apis],
                plugins: [SwaggerUIBundle.plugins.DownloadUrl]
            });
        };
    </script>
</body>
</html>
  `;

  return reply.type('text/html').send(html);
}
