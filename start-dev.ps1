# Dev-Mode script for Supermarket Multiplayer
# Starts Server and Client in DEV mode (Live Reload)
# Works with a single ngrok tunnel (compatible with Free accounts)

$ServerPort = 2567
$ClientPort = 3000

Write-Host "--- [ Supermarkt DEV-MODE Starter ] ---" -ForegroundColor Cyan

# 0. Cleanup old processes
Write-Host "Bereinige alte Prozesse..." -ForegroundColor Gray
$oldPorts = @($ServerPort, $ClientPort)
foreach ($port in $oldPorts) {
    $pids = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        try { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } catch {}
    }
}
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force

# 1. Start Ngrok on Vite port
Write-Host "[1/3] Starte ngrok auf Port $ClientPort (Vite)..." -ForegroundColor Yellow
$ngrokProcess = Start-Process ngrok -ArgumentList "http $ClientPort" -PassThru -WindowStyle Hidden

# 2. Get Public URL with Retry Logic
$publicUrl = ""
$maxRetries = 5
Write-Host "Warte auf ngrok API..." -NoNewline
for ($i = 1; $i -le $maxRetries; $i++) {
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 2
    try {
        $tunnels = (Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels").tunnels
        if ($tunnels.Count -gt 0) {
            $publicUrl = $tunnels[0].public_url
            Write-Host " OK!" -ForegroundColor Green
            break
        }
    } catch {}
}

if (-not $publicUrl) {
    Write-Host "`n[!] Fehler: Konnte ngrok URL nicht abrufen." -ForegroundColor Red
} else {
    Write-Host "URL bereit: $publicUrl" -ForegroundColor Green
    
    # Remove custom server URL file if it exists (fallback to auto-detection)
    if (Test-Path "client/public/server_url.txt") { Remove-Item "client/public/server_url.txt" }
}

# 3. Start Server (Backend)
Write-Host "[2/3] Starte Backend Server (Dev Mode)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm run dev"

# 4. Start Client (Frontend)
Write-Host "[3/3] Starte Frontend Client (Vite Dev Mode)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"

Write-Host "`n--- DEV-MODE AKTIV ---" -ForegroundColor Cyan
Write-Host "Aenderungen werden SOFORT uebernommen (HMR)!" -ForegroundColor White
if ($publicUrl) {
    Write-Host "DEINE FREUNDE NUTZEN DIESEN LINK:" -ForegroundColor White
    Write-Host "👉 $publicUrl" -ForegroundColor Green -BackgroundColor Black
}
Write-Host "`nDIESES FENSTER OFFEN LASSEN!" -ForegroundColor Cyan
Read-Host "Druecke Enter, um alles zu beenden"

# Cleanup on exit
Write-Host "Beende Prozesse..."
$ngrokProcess | Stop-Process -Force -ErrorAction SilentlyContinue
