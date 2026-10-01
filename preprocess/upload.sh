#!/usr/bin/env bash
# Upload preprocess/out/<version>/ to a Cloudflare R2 bucket with rclone (see DEPLOY.md).
# Usage: preprocess/upload.sh [rclone-remote] [bucket]      (defaults: r2 gl-wrf-data)
#
# Chunks are cached for a year (immutable): after the site is public, change data only under a new
# version prefix (VERSION in build_stores.py and in src/data/catalog.ts). Metadata and catalog.json
# get a 5-minute cache so a re-upload shows up quickly.
set -euo pipefail

REMOTE="${1:-r2}"
BUCKET="${2:-gl-wrf-data}"
OUT="$(cd "$(dirname "$0")" && pwd)/out"
LONG="Cache-Control: public, max-age=31536000, immutable"
SHORT="Cache-Control: public, max-age=300"

for dir in "$OUT"/*/; do
  version="$(basename "$dir")"
  dest="$REMOTE:$BUCKET/$version"
  echo "== $version → $dest"
  # 1. Chunks: mirror the version folder (removes stale chunks; metadata is excluded here and left alone).
  rclone sync "$dir" "$dest" --exclude "catalog.json" --exclude ".z*" --header-upload "$LONG" --progress
  # 2. Metadata (.zmetadata/.zarray/.zattrs/.zgroup) and catalog.json, short cache.
  rclone copy "$dir" "$dest" --include "catalog.json" --include ".z*" --header-upload "$SHORT" --progress
done
