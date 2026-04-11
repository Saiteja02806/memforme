# Test script to bypass SSL validation
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

# Test health endpoint
try {
    $response = Invoke-WebRequest -Uri "https://mcp.velocityconsulting.in/health" -UseBasicParsing
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Content: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}

# Test OAuth discovery
try {
    $response = Invoke-WebRequest -Uri "https://mcp.velocityconsulting.in/.well-known/oauth-authorization-server" -UseBasicParsing
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Content: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
