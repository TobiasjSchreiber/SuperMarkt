# Cloudflare-Mode script for Supermarket Multiplayer
# Starts Server and Client and exposes them via Cloudflare Tunnel

$ServerPort = 2567
$ClientPort = 3000

Write-Host "--- [ Supermarkt CLOUDFLARE Starter ] ---" -ForegroundColor Cyan

# 0. Cleanup old processes
Write-Host "Bereinige alte Prozesse..." -ForegroundColor Gray
$oldPorts = @($ServerPort, $ClientPort)
foreach ($port in $oldPorts) {
    $pids = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        try { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } catch {}
    }
}
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force

# 1. Start Server (Backend)
Write-Host "[1/3] Starte Backend Server (Dev Mode)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm run dev"

# 2. Start Client (Frontend)
Write-Host "[2/3] Starte Frontend Client (Vite Dev Mode)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"

# 3. Start Cloudflare Tunnel
Write-Host "[3/3] Starte Cloudflare Tunnel..." -ForegroundColor Yellow
Write-Host "Warte kurz, bis die URL generiert wird..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cloudflared tunnel --url http://localhost:$ClientPort"

Write-Host "`n--- CLOUDFLARE TUNNEL AKTIV ---" -ForegroundColor Cyan
Write-Host "1. Suche im neu geoeffneten Fenster nach der URL (endet auf .trycloudflare.com)" -ForegroundColor White
Write-Host "2. Kopiere diesen Link und schicke ihn deinen Freunden." -ForegroundColor White
Write-Host "3. Cloudflare hat KEIN Bandbreiten-Limit wie ngrok! 🚀" -ForegroundColor Green

Write-Host "`nDIESES FENSTER OFFEN LASSEN!" -ForegroundColor Cyan
Read-Host "Druecke Enter, um alles zu beenden"

# Cleanup on exit
Write-Host "Beende Prozesse..."
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
