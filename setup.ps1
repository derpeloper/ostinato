# ostinato setup script (windows)
# installs all dependencies and launches the bot.
# "one script to rule them all."

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "=== ostinato setup ===" -ForegroundColor Cyan
Write-Host ""

function Check-Command {
    param ($CommandName)
    try {
        $null = Get-Command $CommandName -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

if (!(Check-Command "node")) {
    Write-Host "[error] Node.js is not installed or not in your PATH." -ForegroundColor Red
    Write-Host "please download and install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "if you need help, please open an issue on the GitHub repository." -ForegroundColor Yellow
    Read-Host "press Enter to exit..."
    exit 1
}

if (!(Check-Command "npm")) {
    Write-Host "[error] npm is not installed or not in your PATH." -ForegroundColor Red
    Write-Host "please download and install Node.js (which includes npm) from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "if you need help, please open an issue on the GitHub repository." -ForegroundColor Yellow
    Read-Host "press Enter to exit..."
    exit 1
}

$nodeVersion = node -v
Write-Host "using Node.js version $nodeVersion" -ForegroundColor DarkGray

try {
    Write-Host "[1/2] installing ostinato dependencies..."
    Set-Location $scriptDir
    npm install
    Write-Host "  done." -ForegroundColor Green
    Write-Host ""

    Write-Host "[2/2] installing supertonic engine dependencies..."
    Set-Location (Join-Path $scriptDir "supertonic\nodejs")
    npm install
    Write-Host "  done." -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "[error] failed to install dependencies." -ForegroundColor Red
    Write-Host "please check the error messages above for troubleshooting." -ForegroundColor Yellow
    Write-Host "common issues include: missing build tools, network errors, or outdated Node/npm versions." -ForegroundColor Yellow
    Write-Host "if you cannot resolve this, please copy the console output and open an issue on the GitHub repository." -ForegroundColor Yellow
    Read-Host "press Enter to exit..."
    exit 1
}

Write-Host "=== setup complete ===" -ForegroundColor Cyan
Write-Host "starting the bot..." -ForegroundColor DarkGray
Write-Host ""

Set-Location $scriptDir

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir'; node src/index.js"
