#!/bin/bash
#
# ostinato - bringing every message to life.
# Copyright (C) 2026  derpeloper
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published
# by the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

ACCENT="\033[38;2;51;124;151m"
RESET="\033[0m"
DIM="\033[2m"
BOLD="\033[1m"

trap 'printf "\033[?25h"; exit 1' INT TERM

check_weights() {
    local target_dir="src/assets/engine/onnx"
    local required_models=("duration_predictor.onnx" "text_encoder.onnx" "vector_estimator.onnx" "vocoder.onnx")
    local required_configs=("tts.json" "unicode_indexer.json")

    [ -d "$target_dir" ] || return 1

    for model in "${required_models[@]}"; do
        local file_path="$target_dir/$model"
        [ -f "$file_path" ] || return 1
        local size
        size=$(wc -c < "$file_path" 2>/dev/null || echo 0)
        size=$(echo "$size" | tr -d '[:space:]')
        if [ "$size" -lt 1048576 ]; then
            return 1
        fi
    done

    for cfg in "${required_configs[@]}"; do
        local file_path="$target_dir/$cfg"
        [ -f "$file_path" ] || return 1
        local size
        size=$(wc -c < "$file_path" 2>/dev/null || echo 0)
        size=$(echo "$size" | tr -d '[:space:]')
        if [ "$size" -lt 10 ]; then
            return 1
        fi
    done

    return 0
}

if ! command -v node &> /dev/null || ! command -v npm &> /dev/null || ! command -v git &> /dev/null || (! command -v git-lfs &> /dev/null && ! git lfs version &> /dev/null); then
    printf "${ACCENT}[!] Node.js, npm, git, and git-lfs are required. Please install them to continue.${RESET}\n"
    exit 1
fi

if ! check_weights; then
    if [ -d "src/assets/engine/onnx" ]; then
        printf "\n${ACCENT}[*] Incomplete or invalid voice model assets detected in src/assets/engine/onnx.${RESET}\n"
        rm -rf "src/assets/engine/onnx"
    else
        printf "\n${ACCENT}[*] Voice model assets not found in src/assets/engine.${RESET}\n"
    fi
    printf "${DIM}Downloading Supertonic 3 assets (onnx) from Hugging Face...${RESET}\n"

    TMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'supertonic')
    cleanup_tmp() {
        rm -rf "$TMP_DIR"
    }
    trap cleanup_tmp EXIT INT TERM

    git clone --depth 1 --no-checkout https://huggingface.co/supertone-oss-archive/supertonic-3 "$TMP_DIR"
    (
        cd "$TMP_DIR"
        git sparse-checkout init --cone 2>/dev/null || git config core.sparseCheckout true
        git sparse-checkout set onnx 2>/dev/null || {
            mkdir -p .git/info
            printf "onnx/*\n" > .git/info/sparse-checkout
        }
        git checkout
        git lfs pull --include="onnx/*" 2>/dev/null || git lfs pull 2>/dev/null || true
    )

    mkdir -p src/assets/engine
    for folder in onnx; do
        if [ -d "$TMP_DIR/$folder" ]; then
            rm -rf "src/assets/engine/$folder"
            cp -r "$TMP_DIR/$folder" src/assets/engine/
        fi
    done

    rm -rf "$TMP_DIR"
    trap - EXIT
    trap 'printf "\033[?25h"; exit 1' INT TERM

    if ! check_weights; then
        printf "\n${ACCENT}[!] Error: Voice model weights verification failed.${RESET}\n"
        printf "${DIM}Expected ONNX model weights were not downloaded properly (they may be Git LFS pointers or missing).${RESET}\n"
        printf "${DIM}Please ensure git-lfs is installed, run 'git lfs install', and check your network connection.${RESET}\n"
        rm -rf "src/assets/engine/onnx"
        exit 1
    fi

    printf "${ACCENT}[+] Voice model assets verified and installed to src/assets/engine.${RESET}\n"
fi

clear
printf "\n  ${ACCENT}* ostinato / onboarding${RESET}\n"
printf "  ${DIM}\"the variables that breathe life into the machine.\"${RESET}\n\n"
sleep 2.5

printf "${ACCENT}[1/4] Authentication${RESET}\n"
printf "Enter your Discord Bot Token: "
read -r BOT_TOKEN
while [ -z "$BOT_TOKEN" ]; do
    printf "Token cannot be empty. Please enter your Bot Token: "
    read -r BOT_TOKEN
done

node -e '
    const fs = require("fs");
    const path = "./src/env.json";
    let data = {};
    if (fs.existsSync(path)) {
        try { data = JSON.parse(fs.readFileSync(path, "utf8")); } catch(e) {}
    }
    data.token = process.argv[1];
    fs.writeFileSync(path, JSON.stringify(data, null, 4));
' "$BOT_TOKEN"
printf "\n"

printf "${ACCENT}[2/4] Server Scope${RESET}\n"
printf "Is this bot intended for a single server only? (y/N): "
read -r IS_SINGLE_SERVER
GUILD_ID="null"

if [[ "$IS_SINGLE_SERVER" =~ ^[Yy]$ ]]; then
    printf "Enter your Discord Server (Guild) ID: "
    read -r GUILD_ID_INPUT
    while [ -z "$GUILD_ID_INPUT" ]; do
        printf "Guild ID cannot be empty. Enter Discord Server ID: "
        read -r GUILD_ID_INPUT
    done
    GUILD_ID="'$GUILD_ID_INPUT'"
fi
printf "\n"

printf "${ACCENT}[3/4] Hardware Acceleration${RESET}\n"
printf "Select engine execution backend (Use ↑/↓ keys, Enter to confirm):\n"

OPTIONS=("CPU (Standard host inference)" "DirectML (Windows/WSL AMD, Intel, NVIDIA GPU)" "NVIDIA CUDA (Linux/Windows NVIDIA GPU)")
SELECTED=0
COUNT=${#OPTIONS[@]}

for i in "${!OPTIONS[@]}"; do
    if [ "$i" -eq "$SELECTED" ]; then
        printf "  %b> %s%b\n" "$ACCENT" "${OPTIONS[$i]}" "$RESET"
    else
        printf "    %b%s%b\n" "$DIM" "${OPTIONS[$i]}" "$RESET"
    fi
done

printf "\033[?25l"
while true; do
    IFS= read -rsn1 KEY
    if [ "$KEY" = $'\x1b' ]; then
        read -rsn2 -t 0.1 REST || true
        if [ "$REST" = "[A" ]; then
            SELECTED=$(( (SELECTED - 1 + COUNT) % COUNT ))
        elif [ "$REST" = "[B" ]; then
            SELECTED=$(( (SELECTED + 1) % COUNT ))
        fi
    elif [ "$KEY" = "" ]; then
        break
    else
        continue
    fi

    printf "\033[%dA" "$COUNT"

    for i in "${!OPTIONS[@]}"; do
        if [ "$i" -eq "$SELECTED" ]; then
            printf "\033[2K  %b> %s%b\n" "$ACCENT" "${OPTIONS[$i]}" "$RESET"
        else
            printf "\033[2K    %b%s%b\n" "$DIM" "${OPTIONS[$i]}" "$RESET"
        fi
    done
done
printf "\033[?25h\n"

USE_GPU="false"
GPU_PROVIDER="'cuda'"

if [ "$SELECTED" -eq 1 ]; then
    USE_GPU="true"
    GPU_PROVIDER="'dml'"
elif [ "$SELECTED" -eq 2 ]; then
    USE_GPU="true"
    GPU_PROVIDER="'cuda'"
fi

printf "${ACCENT}[4/4] Resource Safety & Allocation${RESET}\n"
printf "${DIM}(Use ↑/↓ keys to navigate, Enter to edit or confirm)${RESET}\n"

NAMES=("workerCount" "maxConcurrency" "maxPerGuildConcurrency" "workerMemoryLimit" "Save & Launch")
VALS=("2" "100" "20" "1610612736" "")
DESCS=(
    "Parallel speech inference worker threads."
    "Total active requests processed across all servers."
    "Maximum concurrent jobs running within a single server."
    "Process memory limit (in bytes) before worker recycling."
    "Apply configuration and start ostinato."
)
SELECTED_RES=0
COUNT_RES=${#NAMES[@]}
EDITING=false
BUF=""

draw_settings() {
    for i in "${!NAMES[@]}"; do
        if [ "$i" -eq "$SELECTED_RES" ]; then
            if [ "$EDITING" = true ]; then
                printf "\033[2K  %b> %s: %s_%b  %b[Type value, Enter to save, Esc to cancel]%b\n" "$ACCENT" "${NAMES[$i]}" "$BUF" "$RESET" "$DIM" "$RESET"
            else
                if [ "$i" -lt 4 ]; then
                    printf "\033[2K  %b> %s: %s%b  %b- %s%b\n" "$ACCENT" "${NAMES[$i]}" "${VALS[$i]}" "$RESET" "$DIM" "${DESCS[$i]}" "$RESET"
                else
                    printf "\033[2K  %b> %s%b  %b- %s%b\n" "$ACCENT" "${NAMES[$i]}" "$RESET" "$DIM" "${DESCS[$i]}" "$RESET"
                fi
            fi
        else
            printf "\033[2K    %b%s%b\n" "$DIM" "${NAMES[$i]}" "$RESET"
        fi
    done
}

draw_settings

printf "\033[?25l"
while true; do
    IFS= read -rsn1 KEY

    if [ "$EDITING" = true ]; then
        if [ "$KEY" = "" ]; then
            if [ -n "$BUF" ]; then
                VALS[$SELECTED_RES]="$BUF"
            fi
            EDITING=false
            BUF=""
        elif [ "$KEY" = $'\x1b' ]; then
            read -rsn2 -t 0.05 _ || true
            EDITING=false
            BUF=""
        elif [ "$KEY" = $'\x7f' ] || [ "$KEY" = $'\b' ]; then
            BUF="${BUF%?}"
        elif [[ "$KEY" =~ ^[0-9a-zA-Z_.-]$ ]]; then
            BUF="${BUF}${KEY}"
        fi
    else
        if [ "$KEY" = $'\x1b' ]; then
            read -rsn2 -t 0.1 REST || true
            if [ "$REST" = "[A" ]; then
                SELECTED_RES=$(( (SELECTED_RES - 1 + COUNT_RES) % COUNT_RES ))
            elif [ "$REST" = "[B" ]; then
                SELECTED_RES=$(( (SELECTED_RES + 1) % COUNT_RES ))
            fi
        elif [ "$KEY" = "" ]; then
            if [ "$SELECTED_RES" -eq 4 ]; then
                break
            else
                EDITING=true
                BUF=""
            fi
        fi
    fi

    printf "\033[%dA" "$COUNT_RES"
    draw_settings
done
printf "\033[?25h\n"

node -e '
    const fs = require("fs");
    let content = fs.readFileSync("./src/config.js", "utf8");
    const guildId = process.argv[1];
    const useGpu = process.argv[2];
    const gpuProvider = process.argv[3];
    const workerCount = process.argv[4];
    const maxConcurrency = process.argv[5];
    const maxPerGuildConcurrency = process.argv[6];
    const workerMemoryLimit = process.argv[7];

    content = content.replace(/guildId:\s*[^,]+,/, `guildId:  ${guildId},`);
    if (/useGpu:/.test(content)) {
        content = content.replace(/useGpu:\s*[^,]+,/, `useGpu: ${useGpu},`);
    } else {
        content = content.replace(/(clientId:[^\n]+\n)/, `$1    useGpu: ${useGpu},\n    gpuProvider: ${gpuProvider},\n`);
    }
    if (/gpuProvider:/.test(content)) {
        content = content.replace(/gpuProvider:\s*[^,]+,/, `gpuProvider: ${gpuProvider},`);
    }
    content = content.replace(/workerCount:\s*[^,]+,/, `workerCount:            ${workerCount},`);
    content = content.replace(/maxConcurrency:\s*[^,]+,/, `maxConcurrency:         ${maxConcurrency},`);
    content = content.replace(/maxPerGuildConcurrency:\s*[^,]+,/, `maxPerGuildConcurrency: ${maxPerGuildConcurrency},`);
    content = content.replace(/workerMemoryLimit:\s*[^,]+,/, `workerMemoryLimit:      ${workerMemoryLimit},`);

    fs.writeFileSync("./src/config.js", content);
' "$GUILD_ID" "$USE_GPU" "$GPU_PROVIDER" "${VALS[0]}" "${VALS[1]}" "${VALS[2]}" "${VALS[3]}"

printf "${ACCENT}[+] Configuration saved.${RESET}\n"
printf "${DIM}Installing dependencies...${RESET}\n"
npm install --silent

printf "\n${ACCENT}* starting ostinato...${RESET}\n\n"
node bot.js