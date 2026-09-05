#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

REPO_NAME="background-generator"
OWNER="$(gh api user --jq .login 2>/dev/null || true)"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is not installed."
  echo "Install it with: brew install gh"
  echo "Then run: gh auth login"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Running gh auth login..."
  gh auth login
fi

OWNER="$(gh api user --jq .login)"

echo "Publishing to GitHub as $OWNER/$REPO_NAME"

if [ ! -d .git ]; then
  git init
  git add .
  git commit -m "Initial Background Studio"
  git branch -M main
else
  git add .
  if ! git diff --cached --quiet; then
    git commit -m "Update Background Studio"
  fi
fi

if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  echo "Repository already exists."
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://github.com/$OWNER/$REPO_NAME.git"
  fi
  git push -u origin main
else
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push --description "Visual gradient, shadow, radius and background export studio for CSS, UIKit and SwiftUI"
fi

cat <<MSG

Done.
Repository: https://github.com/$OWNER/$REPO_NAME

Enable the website once:
GitHub -> Settings -> Pages -> Source -> GitHub Actions

Then the site will be:
https://$OWNER.github.io/$REPO_NAME/
MSG
