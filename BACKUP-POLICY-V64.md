# Backup policy — CloserFlow V64

Recommended minimum for production:
- Persistent backend volume.
- Automated daily backup.
- Retain at least 7 daily backups and several longer-term restore points.
- Test restore regularly on a non-production environment.
- Never expose backup files through the public frontend.
- Only administrators may trigger/list backups through the API.

A backup is useful only if restoration has been tested.
