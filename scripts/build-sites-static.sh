#!/usr/bin/env bash
set -euo pipefail

project="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

mkdir -p "$stage/client/assets/css" "$stage/client/assets/js" "$stage/client/assets/img"
mkdir -p "$stage/client/brand" "$stage/client/works" "$stage/server"

for page in index.html websites.html flow.html privacy.html terms.html rights.html; do
  cp "$project/$page" "$stage/client/$page"
done

for stylesheet in veblix-home.css velira-websites.css veblix-flow.css velira-legal.css; do
  cp "$project/assets/css/$stylesheet" "$stage/client/assets/css/$stylesheet"
done

for script in veblix-home.js veblix-flow.js; do
  cp "$project/assets/js/$script" "$stage/client/assets/js/$script"
done

cp "$project/brand/velira-logo-original.jpg" "$stage/client/brand/velira-logo-original.jpg"
cp "$project/assets/img/velira-phone-hero.jpg" "$stage/client/assets/img/velira-phone-hero.jpg"
cp "$project/works/lakshmi.webp" "$stage/client/works/lakshmi.webp"
cp "$project/works/millyedits.webp" "$stage/client/works/millyedits.webp"
cp "$project/works/deutschwerk.webp" "$stage/client/works/deutschwerk.webp"

cp "$project/sites/worker.js" "$stage/server/index.js"
cp "$project/sites/wrangler.json" "$stage/server/wrangler.json"

mkdir -p "$project/dist"
rsync -a --delete "$stage/" "$project/dist/"

printf 'Built %s files into %s\n' "$(find "$project/dist" -type f | wc -l | tr -d ' ')" "$project/dist"
