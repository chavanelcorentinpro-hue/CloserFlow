# Déploiement V66 sans disque persistant local

1. Créer un projet Supabase.
2. Exécuter `server/supabase-schema-v66.sql`.
3. Déployer l'API depuis GitHub sur Render.
4. Variables serveur :
   - `CLOSERFLOW_ALLOWED_ORIGINS`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Vérifier `/api/health/live` puis `/api/health/ready`.
6. Tester deux workspaces séparés.

La clé service-role reste exclusivement côté backend.
