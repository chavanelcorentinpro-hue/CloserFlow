#!/data/data/com.termux/files/usr/bin/bash
set -e
pkg update -y
pkg install nodejs -y
npm install
printf '\nInstallation terminée.\nTerminal 1 : npm run server\nTerminal 2 : npm run dev -- --host 127.0.0.1 --port 5175\n'
