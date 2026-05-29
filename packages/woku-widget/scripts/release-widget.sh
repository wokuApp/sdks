#!/usr/bin/env bash
# release-widget.sh — Build and publish woku-widget to S3 + CloudFront.
#
# Usage:
#   SEMVER=0.1.0 BUCKET=cdn-woku-app CF_DIST_ID=EXAMPLEID ./scripts/release-widget.sh
#
# Required env vars:
#   SEMVER        — package version, e.g. 0.1.0
#   BUCKET        — S3 bucket name (confirm with infra: assumed cdn-woku-app)
#   CF_DIST_ID    — CloudFront distribution ID for cdn.woku.app
#
# Optional env vars:
#   DRY_RUN=1     — skip the actual aws s3 sync and CloudFront invalidation

set -euo pipefail

SEMVER="${SEMVER:?SEMVER env var is required}"
BUCKET="${BUCKET:?BUCKET env var is required}"
CF_DIST_ID="${CF_DIST_ID:?CF_DIST_ID env var is required}"
MAJOR="v$(echo "$SEMVER" | cut -d. -f1)"
VERSIONED_PATH="woku-widget/v${SEMVER}"
ALIAS_PATH="woku-widget/${MAJOR}"

DIST_APP="dist/app"
DIST_LOADER="dist/loader"

echo "==> Building woku-widget v${SEMVER}"
pnpm build

echo "==> Uploading versioned assets to s3://${BUCKET}/${VERSIONED_PATH}/"
if [ "${DRY_RUN:-0}" != "1" ]; then
  # Upload micro-app assets (hashed filenames → immutable cache)
  aws s3 sync "${DIST_APP}/assets/" "s3://${BUCKET}/${VERSIONED_PATH}/assets/" \
    --cache-control "public, max-age=31536000, immutable" \
    --content-type "application/javascript"

  # Upload index.html (versioned — also immutable for pinned semver)
  aws s3 cp "${DIST_APP}/index.html" "s3://${BUCKET}/${VERSIONED_PATH}/index.html" \
    --cache-control "public, max-age=31536000, immutable" \
    --content-type "text/html"

  # Upload versioned loader
  aws s3 cp "${DIST_LOADER}/loader.js" "s3://${BUCKET}/${VERSIONED_PATH}/loader.js" \
    --cache-control "public, max-age=31536000, immutable" \
    --content-type "application/javascript"
fi

echo "==> Updating major-alias ${ALIAS_PATH}/"
if [ "${DRY_RUN:-0}" != "1" ]; then
  # Major-alias: short cache (5 min) so it can be updated on each release
  aws s3 cp "${DIST_LOADER}/loader.js" "s3://${BUCKET}/${ALIAS_PATH}/loader.js" \
    --cache-control "public, max-age=300" \
    --content-type "application/javascript"

  aws s3 cp "${DIST_APP}/index.html" "s3://${BUCKET}/${ALIAS_PATH}/index.html" \
    --cache-control "public, max-age=300" \
    --content-type "text/html"

  aws s3 sync "${DIST_APP}/assets/" "s3://${BUCKET}/${ALIAS_PATH}/assets/" \
    --cache-control "public, max-age=31536000, immutable" \
    --content-type "application/javascript"

  echo "==> Invalidating CloudFront alias path /${ALIAS_PATH}/*"
  aws cloudfront create-invalidation \
    --distribution-id "${CF_DIST_ID}" \
    --paths "/${ALIAS_PATH}/*"
fi

echo "==> Done. Widget available at:"
echo "    https://cdn.woku.app/${ALIAS_PATH}/loader.js  (major alias, short cache)"
echo "    https://cdn.woku.app/${VERSIONED_PATH}/loader.js  (semver-pinned, immutable)"
