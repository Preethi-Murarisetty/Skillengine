$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $projectRoot '.venv\Scripts\python.exe'

if (-not (Test-Path $python)) {
    throw "Project interpreter not found at $python. Create .venv and install dependencies with: .\.venv\Scripts\python.exe -m pip install -r requirements.txt"
}

$candidatePorts = @(8000, 8001, 8002, 8003, 8010)
$port = $null

foreach ($candidate in $candidatePorts) {
    $listener = Get-NetTCPConnection -LocalPort $candidate -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $listener) {
        $port = $candidate
        break
    }
}

if (-not $port) {
    throw "No free local port was found in the candidate list 8000, 8001, 8002, 8003, 8010. Stop the conflicting process or pick a free port manually."
}

Write-Host "Starting Role Interview API on http://127.0.0.1:$port/docs"
Set-Location $projectRoot
& $python -m uvicorn app.main:app --reload --host 127.0.0.1 --port $port
exit $LASTEXITCODE