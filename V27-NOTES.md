# CloserFlow 27.0.0 — Build Reproducibility

- Ajout d'un doctor de build sans dépendances.
- Ajout d'un contrôle Android dédié.
- Workflow GitHub avec diagnostics automatiques en cas d'échec.
- TypeScript, build web, Capacitor et Gradle ordonnés explicitement.
- Android versionName/versionCode synchronisés en 27.0.0 / 270000.
- Android cleartext traffic durci dans le manifeste quand applicable.
- package-lock root version synchronisée quand le fichier est valide.
- Scripts `ci:verify`, `build:release`, `android:debug`, `android:release-check`.
- Toutes les fonctions V26 et précédentes conservées.

- Correction finale des routes BusinessOS et Company Autopilot détectées par le release-check.

- Premier typecheck réel tenté : blocage identifié sur installation npm partielle.
- Ajout `install:check` pour détecter un node_modules incomplet avant TypeScript.
- Doctor renforcé : la présence du dossier node_modules seule n'est plus considérée comme suffisante.
