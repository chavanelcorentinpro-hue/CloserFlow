# Mise à jour vers v0.2.0-alpha
Dans Termux, arrêtez Vite avec CTRL+C puis :

```bash
cd ~
cp ~/storage/downloads/CloserFlow-v0.2.0-alpha.zip .
unzip CloserFlow-v0.2.0-alpha.zip
cd ~/CloserFlow-v0.2.0-alpha
npm install
npm run dev -- --host 0.0.0.0
```
Ouvrez http://localhost:5173. Dans Chrome, menu ⋮ puis « Ajouter à l'écran d'accueil » pour installer la PWA.
