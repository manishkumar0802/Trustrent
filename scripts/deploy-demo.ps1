$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\")).Path
$port = 3000

function Test-PortOpen([int]$Port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", $Port)
        $tcp.Close()
        return $true
    }
    catch {
        return $false
    }
}

if (Test-PortOpen -Port $port) {
    Write-Host "A dev server is already running on http://localhost:$port"
    Write-Host "Open the existing app in the browser and continue with the demo."
    exit 0
}

Set-Location $root
Write-Host "Starting TrustRent frontend..."
npm run dev --workspace @trustrent/web
