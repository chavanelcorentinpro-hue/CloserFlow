# V62 production deployment

Frontend: deploy the compiled `dist/` directory to the static host.

Backend: deploy `server/` separately to a persistent HTTPS Node.js host.

Required server configuration:
- `CLOSERFLOW_DATA_DIR`: persistent volume/path.
- `CLOSERFLOW_ALLOWED_ORIGINS`: exact public frontend origin(s), never `*`.

Do not put provider secret keys, webhook secrets, database passwords or signing secrets in the frontend or any `VITE_*` variable.

Before sales, verify `/api/health/production` returns `ready: true`, then test two distinct workspaces to ensure one account cannot read or modify the other's data.
