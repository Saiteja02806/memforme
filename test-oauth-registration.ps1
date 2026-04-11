$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    client_name = "Test Client"
    client_uri = "https://example.com"
    redirect_uris = @("https://chatgpt.com")
    scopes = @("read", "write")
} | ConvertTo-Json

try {
    Write-Host "Testing OAuth registration..."
    $response = Invoke-WebRequest -Uri "https://mcp-server-production-ddee.up.railway.app/oauth/register" -Method POST -Headers $headers -Body $body
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
