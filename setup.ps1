#
# ostinato - bringing every message to life.
# Copyright (C) 2026  derpeloper
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published
# by the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

$accent = "$([char]27)[38;2;51;124;151m"
$reset  = "$([char]27)[0m"
$dim    = "$([char]27)[2m"
$bold   = "$([char]27)[1m"
$esc    = [char]27

function Check-Command ($cmd) {
    return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

function Check-GitLfs {
    if (Check-Command "git-lfs") { return $true }
    try {
        $null = git lfs version 2>&1
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Test-VoiceWeights {
    param ([string]$onnxDir)

    $requiredModels = @(
        "duration_predictor.onnx",
        "text_encoder.onnx",
        "vector_estimator.onnx",
        "vocoder.onnx"
    )
    $requiredConfigs = @(
        "tts.json",
        "unicode_indexer.json"
    )

    if (!(Test-Path $onnxDir)) {
        return $false
    }

    foreach ($model in $requiredModels) {
        $filePath = Join-Path $onnxDir $model
        if (!(Test-Path $filePath)) {
            return $false
        }
        $item = Get-Item $filePath -ErrorAction SilentlyContinue
        if (!$item -or $item.Length -lt 1MB) {
            return $false
        }
    }

    foreach ($cfg in $requiredConfigs) {
        $filePath = Join-Path $onnxDir $cfg
        if (!(Test-Path $filePath)) {
            return $false
        }
        $item = Get-Item $filePath -ErrorAction SilentlyContinue
        if (!$item -or $item.Length -lt 10) {
            return $false
        }
    }

    return $true
}

if (!(Check-Command "node") -or !(Check-Command "npm") -or !(Check-Command "git") -or !(Check-GitLfs)) {
    Write-Host "${accent}[!] Node.js, npm, git, and git-lfs are required. Please install them to continue.${reset}"
    Read-Host "Press Enter to exit..."
    exit 1
}

$engineOnnxPath = Join-Path $scriptDir "src\assets\engine\onnx"
if (!(Test-VoiceWeights $engineOnnxPath)) {
    if (Test-Path $engineOnnxPath) {
        Write-Host ""
        Write-Host "${accent}[*] Incomplete or invalid voice model assets detected in src/assets/engine/onnx.${reset}"
        Remove-Item -Path $engineOnnxPath -Recurse -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host ""
        Write-Host "${accent}[*] Voice model assets not found in src/assets/engine.${reset}"
    }
    Write-Host "${dim}Downloading Supertonic 3 assets (onnx) from Hugging Face...${reset}"

    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("supertonic_" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    try {
        git clone --depth 1 --no-checkout https://huggingface.co/supertone-oss-archive/supertonic-3 $tempDir
        Push-Location $tempDir
        try {
            $prevErrorAction = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            git sparse-checkout init --cone
            if ($LASTEXITCODE -eq 0) {
                git sparse-checkout set onnx
            } else {
                git config core.sparseCheckout true
                $sparseInfoDir = Join-Path $tempDir ".git\info"
                if (!(Test-Path $sparseInfoDir)) {
                    New-Item -ItemType Directory -Path $sparseInfoDir -Force | Out-Null
                }
                "onnx/*" | Set-Content (Join-Path $sparseInfoDir "sparse-checkout") -Encoding UTF8
            }
            git checkout
            git lfs pull --include="onnx/*"
            $ErrorActionPreference = $prevErrorAction
        } finally {
            Pop-Location
        }

        $targetDir = Join-Path $scriptDir "src\assets\engine"
        if (!(Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }

        foreach ($folder in @("onnx")) {
            $srcFolder = Join-Path $tempDir $folder
            if (Test-Path $srcFolder) {
                $destFolder = Join-Path $targetDir $folder
                if (Test-Path $destFolder) {
                    Remove-Item -Path $destFolder -Recurse -Force -ErrorAction SilentlyContinue
                }
                Copy-Item -Path $srcFolder -Destination $targetDir -Recurse -Force
            }
        }
    } finally {
        if (Test-Path $tempDir) {
            Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    if (!(Test-VoiceWeights $engineOnnxPath)) {
        Write-Host ""
        Write-Host "${accent}[!] Error: Voice model weights verification failed.${reset}"
        Write-Host "${dim}Expected ONNX model weights were not downloaded properly (they may be Git LFS pointers or missing).${reset}"
        Write-Host "${dim}Please ensure git-lfs is installed, run 'git lfs install', and check your network connection.${reset}"
        if (Test-Path $engineOnnxPath) {
            Remove-Item -Path $engineOnnxPath -Recurse -Force -ErrorAction SilentlyContinue
        }
        Read-Host "Press Enter to exit..."
        exit 1
    }

    Write-Host "${accent}[+] Voice model assets verified and installed to src/assets/engine.${reset}"
}

Clear-Host
Write-Host ""
Write-Host "  ${accent}* ostinato / onboarding${reset}"
Write-Host "  ${dim}`"the variables that breathe life into the machine.`"${reset}"
Write-Host ""
Start-Sleep -Seconds 2.5

Write-Host "${accent}[1/4] Authentication${reset}"
$botToken = Read-Host "Enter your Discord Bot Token"
while ([string]::IsNullOrWhiteSpace($botToken)) {
    $botToken = Read-Host "Token cannot be empty. Please enter your Bot Token"
}

$envPath = Join-Path $scriptDir "src\env.json"
$envData = @{}
if (Test-Path $envPath) {
    try {
        $envData = Get-Content $envPath -Raw | ConvertFrom-Json -AsHashtable
    } catch {}
}
$envData["token"] = $botToken
$envData | ConvertTo-Json -Depth 4 | Set-Content $envPath -Encoding UTF8
Write-Host ""

Write-Host "${accent}[2/4] Server Scope${reset}"
$isSingleServer = Read-Host "Is this bot intended for a single server only? (y/N)"
$guildId = "null"

if ($isSingleServer -match "^[Yy]$") {
    $guildInput = Read-Host "Enter your Discord Server (Guild) ID"
    while ([string]::IsNullOrWhiteSpace($guildInput)) {
        $guildInput = Read-Host "Guild ID cannot be empty. Enter Discord Server ID"
    }
    $guildId = "'$guildInput'"
}
Write-Host ""

Write-Host "${accent}[3/4] Hardware Acceleration${reset}"
Write-Host "Select engine execution backend (Use Up/Down keys, Enter to confirm):"

$options = @(
    "CPU (Standard host inference)",
    "DirectML (Windows AMD, Intel, NVIDIA GPU)",
    "NVIDIA CUDA (Windows NVIDIA GPU)"
)
$selectedHw = 0
$countHw = $options.Length

for ($i = 0; $i -lt $countHw; $i++) {
    if ($i -eq $selectedHw) {
        Write-Host "  ${accent}> $($options[$i])${reset}"
    } else {
        Write-Host "    ${dim}$($options[$i])${reset}"
    }
}

[Console]::CursorVisible = $false
try {
    while ($true) {
        $key = [Console]::ReadKey($true)
        if ($key.Key -eq [ConsoleKey]::UpArrow) {
            $selectedHw--
            if ($selectedHw -lt 0) { $selectedHw = $countHw - 1 }
        } elseif ($key.Key -eq [ConsoleKey]::DownArrow) {
            $selectedHw++
            if ($selectedHw -ge $countHw) { $selectedHw = 0 }
        } elseif ($key.Key -eq [ConsoleKey]::Enter) {
            break
        } else {
            continue
        }

        Write-Host -NoNewline "$esc[${countHw}A"

        for ($i = 0; $i -lt $countHw; $i++) {
            if ($i -eq $selectedHw) {
                Write-Host "$esc[2K  ${accent}> $($options[$i])${reset}"
            } else {
                Write-Host "$esc[2K    ${dim}$($options[$i])${reset}"
            }
        }
    }
} finally {
    [Console]::CursorVisible = $true
}
Write-Host ""

$useGpu = "false"
$gpuProvider = "'cuda'"

if ($selectedHw -eq 1) {
    $useGpu = "true"
    $gpuProvider = "'dml'"
} elseif ($selectedHw -eq 2) {
    $useGpu = "true"
    $gpuProvider = "'cuda'"
}

Write-Host "${accent}[4/4] Resource Safety & Allocation${reset}"
Write-Host "${dim}(Use Up/Down keys to navigate, Enter to edit or confirm)${reset}"

$settings = @(
    @{ Name = "workerCount"; Val = "2"; Desc = "Parallel speech inference worker threads." },
    @{ Name = "maxConcurrency"; Val = "100"; Desc = "Total active requests processed across all servers." },
    @{ Name = "maxPerGuildConcurrency"; Val = "20"; Desc = "Maximum concurrent jobs running within a single server." },
    @{ Name = "workerMemoryLimit"; Val = "1610612736"; Desc = "Process memory limit (in bytes) before worker recycling." },
    @{ Name = "Save & Launch"; Val = ""; Desc = "Apply configuration and start ostinato." }
)
$selectedRes = 0
$countRes = $settings.Length
$editing = $false
$buf = ""

function Draw-Settings {
    for ($i = 0; $i -lt $countRes; $i++) {
        if ($i -eq $selectedRes) {
            if ($editing) {
                Write-Host "$esc[2K  ${accent}> $($settings[$i].Name): ${buf}_${reset}  ${dim}[Type value, Enter to save, Esc to cancel]${reset}"
            } else {
                if ($i -lt 4) {
                    Write-Host "$esc[2K  ${accent}> $($settings[$i].Name): $($settings[$i].Val)${reset}  ${dim}- $($settings[$i].Desc)${reset}"
                } else {
                    Write-Host "$esc[2K  ${accent}> $($settings[$i].Name)${reset}  ${dim}- $($settings[$i].Desc)${reset}"
                }
            }
        } else {
            Write-Host "$esc[2K    ${dim}$($settings[$i].Name)${reset}"
        }
    }
}

Draw-Settings

[Console]::CursorVisible = $false
try {
    while ($true) {
        $key = [Console]::ReadKey($true)

        if ($editing) {
            if ($key.Key -eq [ConsoleKey]::Enter) {
                if (-not [string]::IsNullOrWhiteSpace($buf)) {
                    $settings[$selectedRes].Val = $buf.Trim()
                }
                $editing = $false
                $buf = ""
            } elseif ($key.Key -eq [ConsoleKey]::Escape) {
                $editing = $false
                $buf = ""
            } elseif ($key.Key -eq [ConsoleKey]::Backspace) {
                if ($buf.Length -gt 0) {
                    $buf = $buf.Substring(0, $buf.Length - 1)
                }
            } elseif (-not [char]::IsControl($key.KeyChar)) {
                $buf += $key.KeyChar
            }
        } else {
            if ($key.Key -eq [ConsoleKey]::UpArrow) {
                $selectedRes--
                if ($selectedRes -lt 0) { $selectedRes = $countRes - 1 }
            } elseif ($key.Key -eq [ConsoleKey]::DownArrow) {
                $selectedRes++
                if ($selectedRes -ge $countRes) { $selectedRes = 0 }
            } elseif ($key.Key -eq [ConsoleKey]::Enter) {
                if ($selectedRes -eq 4) {
                    break
                } else {
                    $editing = $true
                    $buf = ""
                }
            } else {
                continue
            }
        }

        Write-Host -NoNewline "$esc[${countRes}A"
        Draw-Settings
    }
} finally {
    [Console]::CursorVisible = $true
}

$workerCount = $settings[0].Val
$maxConcurrency = $settings[1].Val
$maxPerGuild = $settings[2].Val
$workerMemory = $settings[3].Val

$configPath = Join-Path $scriptDir "src\config.js"
$cfg = Get-Content $configPath -Raw

$cfg = $cfg -replace "guildId:\s*[^,]+,", "guildId:  $guildId,"
if ($cfg -match "useGpu:") {
    $cfg = $cfg -replace "useGpu:\s*[^,]+,", "useGpu: $useGpu,"
} else {
    $cfg = $cfg -replace "(clientId:[^\n]+\n)", "`$1    useGpu: $useGpu,`n    gpuProvider: $gpuProvider,`n"
}
if ($cfg -match "gpuProvider:") {
    $cfg = $cfg -replace "gpuProvider:\s*[^,]+,", "gpuProvider: $gpuProvider,"
}
$cfg = $cfg -replace "workerCount:\s*[^,]+,", "workerCount:            $workerCount,"
$cfg = $cfg -replace "maxConcurrency:\s*[^,]+,", "maxConcurrency:         $maxConcurrency,"
$cfg = $cfg -replace "maxPerGuildConcurrency:\s*[^,]+,", "maxPerGuildConcurrency: $maxPerGuild,"
$cfg = $cfg -replace "workerMemoryLimit:\s*[^,]+,", "workerMemoryLimit:      $workerMemory,"
Set-Content -Path $configPath -Value $cfg -NoNewline -Encoding UTF8

Write-Host ""
Write-Host "${accent}[+] Configuration saved.${reset}"
Write-Host "${dim}Installing dependencies...${reset}"
npm install --silent

Write-Host ""
Write-Host "${accent}* starting ostinato...${reset}"
Write-Host ""
node bot.js