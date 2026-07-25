# CloserFlow 29.0.0 — Real Build Gate

- Rapport d'environnement reproductible.
- Chaîne GitHub source → npm → TypeScript → Vite → Capacitor → Gradle.
- Diagnostics automatiques à chaque étape.
- Version Android 29.0.0 / code 290000.
- .gitignore durci.
- Build complet toujours considéré non validé tant que npm ci + typecheck + build + Gradle ne passent pas réellement.
- Toutes les fonctions V28 et précédentes conservées.
