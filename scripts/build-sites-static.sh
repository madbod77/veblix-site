#!/usr/bin/env bash
set -euo pipefail

project="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

mkdir -p "$stage/client/assets/css" "$stage/client/assets/js" "$stage/client/assets/img" "$stage/client/assets/fonts"
mkdir -p "$stage/client/brand" "$stage/client/works" "$stage/server"

for page in index.html websites.html flow.html privacy.html privacy-en.html terms.html terms-en.html rights.html rights-en.html; do
  cp "$project/$page" "$stage/client/$page"
done

for stylesheet in veblix-home.css velira-websites.css veblix-flow.css velira-legal.css velira-fonts.css; do
  cp "$project/assets/css/$stylesheet" "$stage/client/assets/css/$stylesheet"
done

cp "$project/assets/fonts/onest-latin.woff2" "$stage/client/assets/fonts/onest-latin.woff2"
cp "$project/assets/fonts/onest-cyrillic.woff2" "$stage/client/assets/fonts/onest-cyrillic.woff2"
cp "$project/assets/fonts/OFL-Onest.txt" "$stage/client/assets/fonts/OFL-Onest.txt"

for script in veblix-home.js veblix-flow.js; do
  cp "$project/assets/js/$script" "$stage/client/assets/js/$script"
done

cp "$project/brand/velira-logo-original.jpg" "$stage/client/brand/velira-logo-original.jpg"
cp "$project/assets/img/velira-phone-hero.jpg" "$stage/client/assets/img/velira-phone-hero.jpg"
cp "$project/works/beauty-salon.webp" "$stage/client/works/beauty-salon.webp"
cp "$project/works/dronprint-v2.webp" "$stage/client/works/dronprint-v2.webp"
cp "$project/works/millyedits.webp" "$stage/client/works/millyedits.webp"
cp "$project/works/deutschwerk.webp" "$stage/client/works/deutschwerk.webp"
cp "$project/works/strikeforge.webp" "$stage/client/works/strikeforge.webp"

cp "$project/sites/worker.js" "$stage/server/index.js"
cp "$project/sites/wrangler.json" "$stage/server/wrangler.json"

mkdir -p "$project/dist"
rsync -a --delete "$stage/" "$project/dist/"

printf 'Built %s files into %s\n' "$(find "$project/dist" -type f | wc -l | tr -d ' ')" "$project/dist"
