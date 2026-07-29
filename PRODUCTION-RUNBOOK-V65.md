# Production runbook V65

Before accepting customers:
1. Deploy `Dockerfile.production` on a host with a persistent volume.
2. Set `CLOSERFLOW_ALLOWED_ORIGINS` to the exact HTTPS frontend origin.
3. Confirm `/api/health/live` and `/api/health/ready` return HTTP 200.
4. Create two distinct workspaces and repeat the isolation tests.
5. Restart the service and verify the database and backups remain present.
6. Only after that should payment be connected.
