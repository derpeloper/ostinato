#!/bin/bash

# ostinato setup script (linux/macos)
# installs all dependencies and launches the bot.
# "one script to rule them all."

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== ostinato setup ==="
echo ""

# Error handling function
handle_error() {
    echo -e "\n[error] an error occurred during setup."
    echo "please check the error messages above for troubleshooting."
    echo "common issues include: missing build tools (build-essential/xcode), network errors, or outdated Node/npm versions."
    echo "if you cannot resolve this, please copy the console output and open an issue on the GitHub repository."
    read -p "press Enter to exit..."
    exit 1
}

trap 'handle_error' ERR

# Check for node and npm
if ! command -v node &> /dev/null; then
    echo "[error] Node.js is not installed or not in your PATH."
    echo "please download and install Node.js from https://nodejs.org/"
    echo "if you need help, please open an issue on the GitHub repository."
    read -p "press Enter to exit..."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "[error] npm is not installed or not in your PATH."
    echo "please download and install Node.js (which includes npm) from https://nodejs.org/"
    echo "if you need help, please open an issue on the GitHub repository."
    read -p "press Enter to exit..."
    exit 1
fi

NODE_VERSION=$(node -v)
echo "using Node.js version $NODE_VERSION"
echo ""

echo "[1/2] installing ostinato dependencies..."
cd "$SCRIPT_DIR"
npm install
echo "  done."

echo ""

echo "[2/2] installing supertonic engine dependencies..."
cd "$SCRIPT_DIR/supertonic/nodejs"
npm install
echo "  done."

echo ""
echo "=== setup complete ==="
echo "starting the bot..."
echo ""

cd "$SCRIPT_DIR"

trap - ERR

if command -v gnome-terminal &> /dev/null; then
    gnome-terminal -- bash -c "cd '$SCRIPT_DIR' && node src/index.js; exec bash"
elif command -v xterm &> /dev/null; then
    xterm -e "cd '$SCRIPT_DIR' && node src/index.js; bash" &
elif [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR' && node src/index.js\""
else
    echo "could not detect a terminal emulator. launching in the current session..."
    node src/index.js
fi
