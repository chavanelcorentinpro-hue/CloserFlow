# Netlify V67 setup

Set these in Netlify Site configuration -> Environment variables:
- CLOSERFLOW_ALLOWED_ORIGINS = https://deluxe-praline-5be713.netlify.app
- SUPABASE_URL = your project URL
- SUPABASE_SERVICE_ROLE_KEY = a newly rotated service-role key

Never commit the service-role key or expose it through a VITE_* variable.

After deploy:
- GET /api/health/live
- GET /api/health/ready

Expected readiness includes:
`"databaseDriver":"supabase"` and `"runtime":"netlify-functions"`.

This V67 package validates the serverless foundation. Full authenticated business endpoints still need migration from server/index.mjs.
