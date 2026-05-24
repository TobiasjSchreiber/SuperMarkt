# Automation script for Supermarket Multiplayer
# Starts Server, Client, and Ngrok Tunnel

$ServerPort = 2567
$ClientPort = 5173

Write-Host "--- 🛒 Supermarkt Multiplayer Starter ---" -ForegroundColor Cyan

# 0. Cleanup old processes
Write-Host "Bereinige alte Prozesse auf Ports $ServerPort und $ClientPort..." -ForegroundColor Gray
$oldProcesses = Get-NetTCPConnection -LocalPort $ServerPort, $ClientPort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $oldProcesses) {
    try { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } catch {}
}
# Also kill old ngrok if any
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force

# 1. Start Ngrok in the background
Write-Host "[1/3] Starte ngrok Tunnel auf Port $ServerPort..." -ForegroundColor Yellow
$ngrokProcess = Start-Process ngrok -ArgumentList "http $ServerPort" -PassThru -WindowStyle Hidden

# Wait a moment for ngrok to initialize
Start-Sleep -Seconds 3

# 2. Get Public URL
try {
    $tunnels = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels"
    $publicUrl = $tunnels.tunnels[0].public_url
    Write-Host "✅ Ngrok bereit! URL: $publicUrl" -ForegroundColor Green
} catch {
    Write-Host "❌ Fehler beim Abrufen der ngrok URL. Läuft ngrok?" -ForegroundColor Red
}

# 3. Build Client (so the server can serve it)
Write-Host "[2/3] Baue Frontend Client (bitte warten)..." -ForegroundColor Yellow
$buildJob = Start-Process powershell -ArgumentList "-Command", "cd client; npm run build" -PassThru -Wait

if ($buildJob.ExitCode -ne 0) {
    Write-Host "❌ Fehler beim Bauen des Clients!" -ForegroundColor Red
}

# 4. Start Server (Backend + Frontend)
Write-Host "[3/3] Starte Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm run dev"

Write-Host "`n--- FERTIG! ---" -ForegroundColor Cyan
Write-Host "DEINE FREUNDE KÖNNEN JETZT HIER SPIELEN:" -ForegroundColor Cyan
Write-Host "👉 $publicUrl" -ForegroundColor Green -BackgroundColor Black
Write-Host "`n(Lokal zum Testen: http://localhost:$ServerPort)" -ForegroundColor White
Write-Host "`nBELEIBE DIESES FENSTER OFFEN! Wenn du es schließt, bricht der Tunnel ab." -ForegroundColor Cyan
Read-Host "Drücke Enter, um alles zu beenden"

# Cleanup on exit
Write-Host "Beende Tunnel und Prozesse..."
$ngrokProcess | Stop-Process -Force -ErrorAction SilentlyContinue

