#!/usr/bin/env bash
# release-widget.sh — Build and publish woku-widget to S3 + CloudFront.
#
# Serves from cdn.woku.app under the /sdks grouping:
#   https://cdn.woku.app/sdks/woku-widget/v1/loader.js        (major alias, short cache)
#   https://cdn.woku.app/sdks/woku-widget/v0.1.0/loader.js    (semver-pinned, immutable)
#
# Infra (woku AWS account 893061506665, us-east-1):
#   BUCKET=woku-landing-cdn-assets   — S3 origin for cdn.woku.app (private, OAC)
#   CF_DIST_ID=ERGI4WK35YP6V         — CloudFront distribution for cdn.woku.app
# The distribution has an empty OriginPath, so cdn.woku.app/<key> maps directly
# to s3://woku-landing-cdn-assets/<key>; no distribution/behavior change is
# needed to publish under a new prefix.
#
# Usage:
#   SEMVER=0.1.0 ./scripts/release-widget.sh
#
# Required env vars:
#   SEMVER        — package version, e.g. 0.1.0
# Optional env vars (default to the woku infra above):
#   BUCKET        — S3 bucket name
#   CF_DIST_ID    — CloudFront distribution ID for cdn.woku.app
#   DRY_RUN=1     — skip the actual aws s3 sync and CloudFront invalidation

set -euo pipefail

SEMVER="${SEMVER:?SEMVER env var is required}"
BUCKET="${BUCKET:-woku-landing-cdn-assets}"
CF_DIST_ID="${CF_DIST_ID:-ERGI4WK35YP6V}"
MAJOR="v$(echo "$SEMVER" | cut -d. -f1)"
VERSIONED_PATH="sdks/woku-widget/v${SEMVER}"
ALIAS_PATH="sdks/woku-widget/${MAJOR}"

DIST_APP="dist/app"
DIST_LOADER="dist/loader"

echo "==> Building woku-widget v${SEMVER}"
pnpm build

# Upload the micro-app's hashed assets (JS + CSS). Content-Type is inferred
# from the file extension by aws s3 (do NOT force application/javascript here,
# it would mislabel the .css). Hashed filenames => immutable cache.
upload_assets() {
  local dest="$1"
  aws s3 sync "${DIST_APP}/assets/" "s3://${BUCKET}/${dest}/assets/" \
    --cache-control "public, max-age=31536000, immutable"
}

echo "==> Uploading versioned assets to s3://${BUCKET}/${VERSIONED_PATH}/"
if [ "${DRY_RUN:-0}" != "1" ]; then
  upload_assets "${VERSIONED_PATH}"

  # index.html (versioned — immutable for a pinned semver)
  aws s3 cp "${DIST_APP}/index.html" "s3://${BUCKET}/${VERSIONED_PATH}/index.html" \
    --cache-control "public, max-age=31536000, immutable" \
    --content-type "text/html"

  # versioned loader
  aws s3 cp "${DIST_LOADER}/loader.js" "s3://${BUCKET}/${VERSIONED_PATH}/loader.js" \
    --cache-control "public, max-age=31536000, immutable" \
    --content-type "application/javascript"
fi

echo "==> Updating major-alias ${ALIAS_PATH}/"
if [ "${DRY_RUN:-0}" != "1" ]; then
  upload_assets "${ALIAS_PATH}"

  # Major-alias entrypoints: short cache (5 min) so each release rolls forward
  aws s3 cp "${DIST_LOADER}/loader.js" "s3://${BUCKET}/${ALIAS_PATH}/loader.js" \
    --cache-control "public, max-age=300" \
    --content-type "application/javascript"

  aws s3 cp "${DIST_APP}/index.html" "s3://${BUCKET}/${ALIAS_PATH}/index.html" \
    --cache-control "public, max-age=300" \
    --content-type "text/html"

  echo "==> Invalidating CloudFront alias path /${ALIAS_PATH}/*"
  aws cloudfront create-invalidation \
    --distribution-id "${CF_DIST_ID}" \
    --paths "/${ALIAS_PATH}/*"
fi

echo "==> Done. Widget available at:"
echo "    https://cdn.woku.app/${ALIAS_PATH}/loader.js  (major alias, short cache)"
echo "    https://cdn.woku.app/${VERSIONED_PATH}/loader.js  (semver-pinned, immutable)"
