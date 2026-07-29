# CloserFlow 64.0.0 — Persistent Database & Backups

- Introduces a server database abstraction (`server/db-v64.mjs`).
- Workspace records stored centrally under the persistent data directory.
- Atomic database writes.
- Legacy workspace JSON migration helper.
- Authenticated DB health endpoint.
- Authenticated current-workspace read/write endpoints.
- Admin-only backup creation/listing.
- Backup restore supported by the DB layer.
- Automated database and backup tests.
- V63 tenant isolation retained.

Note: V64 creates a persistent backend database layer without pretending an external managed SQL service is already provisioned. The next deployment step is to place `CLOSERFLOW_DATA_DIR` on durable storage, or replace this adapter with PostgreSQL while keeping the same server boundary.
