# CloserFlow 67.0.0 — Netlify Serverless

V67 removes the need for a continuously running Render service for staging.

Architecture:
Netlify frontend -> Netlify Function -> Supabase

Included:
- `/api/health/live`
- `/api/health/ready`
- server-only Supabase service-role usage
- exact-origin CORS allowlist
- SPA fallback
- no service-role secret committed to source

Important: V67 currently ports the production health/readiness layer first. The remaining authenticated V66 business API routes must be migrated to functions before this can replace the full V66 server for paying customers.
