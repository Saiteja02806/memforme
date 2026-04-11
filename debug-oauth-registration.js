// Test OAuth registration to debug timestamp issue
const response = await fetch('https://mcp-server-production-ddee.up.railway.app/oauth/register', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        client_name: 'Debug Client',
        client_uri: 'https://example.com',
        redirect_uris: ['https://chatgpt.com'],
        scopes: ['read', 'write']
    })
});

const data = await response.json();
console.log('Full response:', JSON.stringify(data, null, 2));
console.log('client_id_issued_at type:', typeof data.client_id_issued_at);
console.log('client_id_issued_at value:', data.client_id_issued_at);
console.log('Is it a string?', typeof data.client_id_issued_at === 'string');
console.log('Is it a number?', typeof data.client_id_issued_at === 'number');
