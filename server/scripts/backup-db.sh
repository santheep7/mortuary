#!/usr/bin/env bash
# Daily Postgres backup for the production server (Hetzner, self-managed
# Postgres - no managed-service backups to fall back on, so this replaces
# that). Meant to run via cron, e.g.:
#   0 2 * * * /path/to/backup-db.sh >> /var/log/mortuary-backup.log 2>&1
#
# Requires: postgresql-client (for pg_dump) and either the AWS CLI (for
# S3-compatible storage like Hetzner Object Storage / Backblaze B2) or
# rclone, configured with credentials for the backup bucket.
set -euo pipefail

# ── Config - fill these in on the actual server, or source from a
# separate .env file kept out of version control ──────────────────────────
: "${PG_HOST:?Set PG_HOST}"
: "${PG_PORT:=5432}"
: "${PG_USER:?Set PG_USER}"
: "${PG_PASSWORD:?Set PG_PASSWORD}"
: "${PG_DATABASE:?Set PG_DATABASE}"
: "${BACKUP_BUCKET:?Set BACKUP_BUCKET (e.g. s3://mortuary-backups)}"

BACKUP_DIR="/var/backups/mortuary"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="mortuary_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup: $FILENAME"

PGPASSWORD="$PG_PASSWORD" pg_dump \
  -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" \
  --format=plain --no-owner --no-acl \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "[$(date)] Local dump complete: ${BACKUP_DIR}/${FILENAME} ($(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1))"

# Upload off the server - a backup that only lives on the same box as the
# database it's backing up doesn't protect against that box failing.
aws s3 cp "${BACKUP_DIR}/${FILENAME}" "${BACKUP_BUCKET}/${FILENAME}"

echo "[$(date)] Uploaded to ${BACKUP_BUCKET}/${FILENAME}"

# Keep local copies for a short window (fast restore without a download),
# rely on the bucket for anything older.
find "$BACKUP_DIR" -name "mortuary_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

echo "[$(date)] Backup finished successfully."
