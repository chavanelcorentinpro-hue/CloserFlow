# CloserFlow 65.0.0 — Production Backend Pack

- Strict production configuration validation.
- Docker production image running as non-root.
- Persistent Docker volume.
- Liveness endpoint `/api/health/live`.
- Readiness endpoint `/api/health/ready`.
- Graceful SIGTERM/SIGINT shutdown.
- V64 database and V63 tenant isolation retained.

V65 makes the backend deployable. It does not claim that a production host is already running.
