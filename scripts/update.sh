#!/bin/sh
set -eu
./scripts/backup-now.sh
docker compose build --pull
docker compose up -d --remove-orphans
docker image prune -f
