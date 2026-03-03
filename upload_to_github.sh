#!/bin/bash
# TrajectIQ GitHub Upload Script
# ===============================
# This script prepares and uploads TrajectIQ to GitHub

echo "=================================================="
echo "TrajectIQ - GitHub Upload Preparation"
echo "=================================================="

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Error: git is not installed"
    exit 1
fi

# Set the repository URL
REPO_URL="https://github.com/csreekhaanthch-dotcom/TrajectIQ.git"
PROJECT_DIR="/home/z/my-project/download/trajectiq"

echo ""
echo "Project directory: $PROJECT_DIR"
echo "Target repository: $REPO_URL"
echo ""

# Navigate to project directory
cd "$PROJECT_DIR" || exit 1

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
    git branch -M main
fi

# Add all files
echo "Adding files to git..."
git add -A

# Show what will be committed
echo ""
echo "Files to be committed:"
git status --short
echo ""

# Create initial commit
echo "Creating commit..."
git commit -m "Initial commit: TrajectIQ v1.0.0 - Intelligence-Driven Hiring Platform

Features:
- Complete backend Python modules for candidate evaluation
- Resume Parser (PDF/DOCX) with structured output
- Skill Depth & Critical Skill Evaluation
- Impact Authenticity Scoring
- Career Trajectory Analysis
- AI-Assistance Detection (heuristic, signal only)
- Multi-factor Deterministic Scoring Engine
- Email & ATS connectors (Greenhouse, Lever, Workday)
- SQLite database with full audit trail
- CLI interface and FastAPI server
- Comprehensive test suite
- Complete JSON schemas for all modules

Tech Stack:
- Python 3.9+
- Ollama LLM integration (temperature 0.1 for determinism)
- SQLite/PostgreSQL support
- FastAPI for REST API

Documentation:
- README.md with usage examples
- DEPLOYMENT.md for production deployment
- CONTRIBUTING.md for contributors
- Sample data files for testing
"

# Add remote and push
echo ""
echo "Adding remote origin..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

echo ""
echo "=================================================="
echo "Ready to push to GitHub!"
echo "=================================================="
echo ""
echo "To push to GitHub, run:"
echo "  git push -u origin main"
echo ""
echo "Or if you need to authenticate with a token:"
echo "  git push https://<TOKEN>@github.com/csreekhaanthch-dotcom/TrajectIQ.git main"
echo ""
