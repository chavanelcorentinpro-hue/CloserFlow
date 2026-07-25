#!/bin/sh
set -eu
hours="${BACKUP_INTERVAL_HOURS:-24}"
retention="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p /backups
while true; do
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  tar -czf "/backups/closerflow-data-${stamp}.tar.gz" -C /source .
  find /backups -type f -name 'closerflow-data-*.tar.gz' -mtime "+${retention}" -delete
  sleep "$((hours * 3600))"
done
