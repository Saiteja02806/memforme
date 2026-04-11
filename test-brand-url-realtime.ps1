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

Write-Host "Testing brand URL health endpoint at $(Get-Date)..."
try {
    $response = Invoke-WebRequest -Uri "https://mcp.velocityconsulting.in/health" -UseBasicParsing
    Write-Host "SUCCESS - Status Code: $($response.StatusCode)"
    Write-Host "Content: $($response.Content)"
} catch {
    Write-Host "FAILED - Error: $($_.Exception.Message)"
}
