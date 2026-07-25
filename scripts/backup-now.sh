#!/bin/sh
set -eu
mkdir -p backups
volume="${COMPOSE_PROJECT_NAME:-closerflow}_closerflow_data"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
docker run --rm -v "${volume}:/source:ro" -v "$(pwd)/backups:/backups" alpine:3.20 sh -c "tar -czf /backups/closerflow-data-${stamp}.tar.gz -C /source ."
echo "Sauvegarde: backups/closerflow-data-${stamp}.tar.gz"
