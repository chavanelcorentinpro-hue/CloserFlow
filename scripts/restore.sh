#!/bin/sh
set -eu
archive="${1:-}"
[ -f "$archive" ] || { echo "Usage: $0 backups/fichier.tar.gz"; exit 1; }
volume="${COMPOSE_PROJECT_NAME:-closerflow}_closerflow_data"
docker compose stop api backup
docker run --rm -v "${volume}:/target" -v "$(cd "$(dirname "$archive")" && pwd):/backup:ro" alpine:3.20 sh -c "rm -rf /target/* && tar -xzf /backup/$(basename "$archive") -C /target"
docker compose up -d api backup web
