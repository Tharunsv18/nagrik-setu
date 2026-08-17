# setup-postgres.ps1
# Sets up a portable PostgreSQL 16 instance — no admin rights required.
# Run this once after the postgres16 folder is ready.

$pg = "C:\Users\THARUNKUMAR S V\postgres16"
$data = "C:\Users\THARUNKUMAR S V\postgres16-data"
$bin = "$pg\bin"

if (-not (Test-Path "$bin\initdb.exe")) {
    Write-Error "PostgreSQL binaries not found at $pg. Download first."
    exit 1
}

# 1. Initialise the data cluster (only needed once)
if (-not (Test-Path $data)) {
    Write-Host "[1/4] Initialising database cluster at $data ..."
    & "$bin\initdb.exe" -D $data -U postgres -E UTF8 --locale=en_US.UTF-8
    if ($LASTEXITCODE -ne 0) { Write-Error "initdb failed"; exit 1 }
    Write-Host "      Done."
} else {
    Write-Host "[1/4] Data directory already exists — skipping initdb."
}

# 2. Start the server
Write-Host "[2/4] Starting PostgreSQL server on port 5432 ..."
& "$bin\pg_ctl.exe" -D $data -l "$data\postgres.log" start
Start-Sleep -Seconds 3

# Verify it's running
$running = & "$bin\pg_isready.exe" -h localhost -p 5432 2>&1
if ($running -match "accepting connections") {
    Write-Host "      PostgreSQL is running."
} else {
    Write-Error "Server did not start. Check: $data\postgres.log"
    exit 1
}

# 3. Create user + database
Write-Host "[3/4] Creating nagrik user and nagrik_setu database ..."
& "$bin\psql.exe" -h localhost -U postgres -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nagrik') THEN CREATE USER nagrik WITH PASSWORD 'nagrik_password'; END IF; END `$`$;"
& "$bin\psql.exe" -h localhost -U postgres -c "SELECT 'CREATE DATABASE nagrik_setu OWNER nagrik' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'nagrik_setu')" | & "$bin\psql.exe" -h localhost -U postgres
Write-Host "      Done."

# 4. Run Prisma migration
Write-Host "[4/4] Running Prisma migration ..."
Set-Location "C:\Users\THARUNKUMAR S V\OneDrive\Desktop\CIT HACKATHON\backend"
$env:DATABASE_URL = "postgresql://nagrik:nagrik_password@localhost:5432/nagrik_setu?schema=public"
npx prisma migrate dev --name init 2>&1
Write-Host ""
Write-Host "======================================================"
Write-Host " All done! Test with:"
Write-Host "   curl http://localhost:4000/health"
Write-Host " Expected: { status: 'ok', db: 'ok', ... }"
Write-Host "======================================================"
