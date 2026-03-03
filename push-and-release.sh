#!/bin/bash
# =============================================================================
# TrajectIQ - Push and Release Script
# =============================================================================
# This script pushes the GitHub Actions workflow changes and creates a release
# tag to trigger the build process.
#
# Prerequisites:
# - Git installed and configured
# - Push access to the repository
# - Run this script from the project root directory
# =============================================================================

set -e

echo "=============================================="
echo "  TrajectIQ - Push and Release"
echo "=============================================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "Warning: You have uncommitted changes"
    echo "Current status:"
    git status --short
    echo ""
    read -p "Continue anyway? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get the current version
CURRENT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
echo "Current tag: $CURRENT_TAG"

# Suggest next version
if [ "$CURRENT_TAG" = "v0.0.0" ]; then
    SUGGESTED_VERSION="v1.0.0"
else
    # Increment patch version
    MAJOR=$(echo $CURRENT_TAG | cut -d. -f1 | tr -d 'v')
    MINOR=$(echo $CURRENT_TAG | cut -d. -f2)
    PATCH=$(echo $CURRENT_TAG | cut -d. -f3)
    NEW_PATCH=$((PATCH + 1))
    SUGGESTED_VERSION="v${MAJOR}.${MINOR}.${NEW_PATCH}"
fi

echo ""
echo "Suggested new version: $SUGGESTED_VERSION"
read -p "Enter version (or press Enter for suggested): " VERSION
VERSION=${VERSION:-$SUGGESTED_VERSION}

# Ensure version starts with 'v'
if [[ ! "$VERSION" =~ ^v ]]; then
    VERSION="v$VERSION"
fi

echo ""
echo "Will create release: $VERSION"
echo ""
read -p "Proceed? (Y/n): " confirm
if [[ "$confirm" =~ ^[Nn]$ ]]; then
    echo "Aborted"
    exit 1
fi

# Push to main branch
echo ""
echo "Pushing to origin/main..."
git push origin main

# Create and push tag
echo ""
echo "Creating tag: $VERSION"
git tag -a "$VERSION" -m "Release $VERSION

TrajectIQ Enterprise Release

Features:
- Intelligence-driven hiring platform
- Deterministic resume evaluation
- Enterprise-grade security
- Role-based access control
- Bias detection and monitoring

See CHANGELOG.md for details."

echo ""
echo "Pushing tag to trigger workflow..."
git push origin "$VERSION"

echo ""
echo "=============================================="
echo "  Success!"
echo "=============================================="
echo ""
echo "Tag $VERSION has been pushed to GitHub."
echo ""
echo "The GitHub Actions workflow will now build:"
echo "  - TrajectIQ-$VERSION-win-x64.zip (Windows)"
echo "  - TrajectIQ-$VERSION-linux-x64.tar.gz (Linux)"
echo ""
echo "Monitor the build at:"
echo "  https://github.com/csreekhaanthch-dotcom/TrajectIQ/actions"
echo ""
echo "Once complete, download from:"
echo "  https://github.com/csreekhaanthch-dotcom/TrajectIQ/releases/tag/$VERSION"
echo ""
