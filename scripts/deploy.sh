#!/usr/bin/env sh
# Builds the app and publishes dist/ to the gh-pages branch (GitHub Pages source).
set -e
cd "$(dirname "$0")/.."
bun x tsc --noEmit -p .
bun test src
bun run build
rev=$(git rev-parse --short HEAD)
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name=wailregg -c user.email=213139405+wailregg@users.noreply.github.com commit -q -m "deploy $rev"
git push -q -f https://github.com/wailregg/digistore-abonnements.git gh-pages
rm -rf .git
echo "deployed $rev"
