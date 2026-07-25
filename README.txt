CloserFlow v2 — module devis

Remplacez index.html et sw.js à la racine du dépôt.
Le module Devis :
- crée plusieurs lignes de prestation ;
- calcule HT, TVA et TTC ;
- mémorise les devis localement ;
- permet d'imprimer ou enregistrer au format PDF via Android/Chrome.

Commandes Termux :
unzip -o /sdcard/Download/CloserFlow-v2-devis.zip
git add index.html sw.js manifest.webmanifest
git commit -m "Ajout module devis PDF"
git push
