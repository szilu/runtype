#!/usr/bin/env bash

# Install git hooks for the project

HOOKS_DIR="$(git rev-parse --git-dir)/hooks"
PRE_COMMIT="$HOOKS_DIR/pre-commit"

echo "Installing git hooks..."

cat > "$PRE_COMMIT" << 'EOF'
#!/bin/sh

echo "Running biome check..."

if ! pnpm check; then
    echo ""
    echo "Check failed. Please run 'pnpm check:fix' to fix lint, format and import order."
    exit 1
fi
EOF

chmod +x "$PRE_COMMIT"

echo "Pre-commit hook installed successfully."
