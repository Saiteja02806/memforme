add-type @"
    using System.Net;
    using System.Security.Cryptography.X509Certificates;
    public class TrustAllCertsPolicy : ICertificatePolicy {
        public bool CheckValidationResult(ServicePoint srvPoint, X509Certificate certificate, WebRequest request, int certificateProblem) {
            return true;
        }
    }
"@

[System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy

# Test OAuth Discovery API
Write-Host "Testing OAuth Discovery API..."
try {
    $response = Invoke-WebRequest -Uri "https://mcp.velocityconsulting.in/.well-known/oauth-authorization-server" -UseBasicParsing
    Write-Host "SUCCESS - Status Code: $($response.StatusCode)"
    Write-Host "Content: $($response.Content)"
} catch {
    Write-Host "FAILED - Error: $($_.Exception.Message)"
}

# Test Health API
Write-Host "`nTesting Health API..."
try {
    $response = Invoke-WebRequest -Uri "https://mcp.velocityconsulting.in/health" -UseBasicParsing
    Write-Host "SUCCESS - Status Code: $($response.StatusCode)"
    Write-Host "Content: $($response.Content)"
} catch {
    Write-Host "FAILED - Error: $($_.Exception.Message)"
}

# Test OAuth Registration API
Write-Host "`nTesting OAuth Registration API..."
try {
    $response = Invoke-WebRequest -Uri "https://mcp.velocityconsulting.in/oauth/register" -UseBasicParsing
    Write-Host "SUCCESS - Status Code: $($response.StatusCode)"
    Write-Host "Content: $($response.Content)"
} catch {
    Write-Host "FAILED - Error: $($_.Exception.Message)"
}
