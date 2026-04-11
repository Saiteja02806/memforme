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
    $response = Invoke-WebRequest -Uri "https://mcp-server-production-ddee.up.railway.app/oauth/register" -Method POST -Headers $headers -Body $body -UseBasicParsing
    Write-Host "Status Code: $($response.StatusCode)"
    
    $content = $response.Content | ConvertFrom-Json
    Write-Host "Client ID: $($content.client_id)"
    Write-Host "Client Secret: $($content.client_secret)"
    Write-Host "Client ID Issued At: $($content.client_id_issued_at)"
    Write-Host "Type of client_id_issued_at: $($content.client_id_issued_at.GetType().Name)"
    Write-Host "Value of client_id_issued_at: $($content.client_id_issued_at)"
    
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
