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
    Write-Host "Using the existing app instead of starting a duplicate Next.js server."
    exit 0
}

Set-Location $root
npm run dev --workspace @trustrent/web
