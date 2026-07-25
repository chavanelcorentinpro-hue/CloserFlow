# Installation Android avec Termux

1. Installer Termux depuis F-Droid.
2. Dans Termux :
```bash
pkg update -y
pkg install nodejs-lts git -y
```
3. Extraire le projet dans un dossier accessible, puis :
```bash
cd CloserFlow-v0.1.0-alpha
npm install
npm run dev -- --host 0.0.0.0
```
4. Ouvrir dans Chrome l'adresse locale indiquée, généralement `http://localhost:5173`.
