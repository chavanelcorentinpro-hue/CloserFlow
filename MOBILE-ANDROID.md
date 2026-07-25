# CloserFlow Android — développement uniquement avec un téléphone

Cette édition utilise Capacitor et une compilation GitHub Actions. Le code peut être modifié dans Termux, puis l'APK est compilé à distance et téléchargé sur le même téléphone.

## Pourquoi la compilation se fait sur GitHub

Les outils Android officiels et plusieurs binaires Gradle ne sont pas distribués pour Termux ARM de façon officiellement prise en charge. La compilation GitHub évite les serveurs locaux instables et ne nécessite aucun PC.

## Cycle de travail

1. Modifier le code dans Termux.
2. Envoyer le projet sur un dépôt GitHub privé.
3. Ouvrir l'onglet Actions du dépôt.
4. Lancer « Build Android APK ».
5. Télécharger l'artefact `CloserFlow-Android-debug`.
6. Extraire le ZIP et installer `app-debug.apk`.

## Commandes Termux après création du dépôt GitHub

```bash
git init
git add .
git commit -m "CloserFlow Android"
git branch -M main
git remote add origin URL_DU_DEPOT
git push -u origin main
```

Pour les versions suivantes :

```bash
git add .
git commit -m "Mise à jour CloserFlow"
git push
```

Chaque envoi sur `main` déclenche automatiquement une nouvelle compilation APK.
