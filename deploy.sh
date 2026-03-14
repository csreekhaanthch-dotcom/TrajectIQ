#!/bin/bash
# ============================================
# TrajectIQ Deployment Script
# Deploy to Vercel + Python Backend
# ============================================

set -e

echo "=========================================="
echo "TrajectIQ Deployment Script"
echo "=========================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy frontend to Vercel
echo ""
echo "1. Deploying Next.js frontend to Vercel..."
echo "-------------------------------------------"
cd /home/z/my-project

# Check if already linked
if [ ! -f ".vercel/project.json" ]; then
    echo "Linking to Vercel project..."
    echo "Run: vercel link"
    echo "Then run this script again."
    exit 1
fi

# Deploy to production
vercel --prod

echo ""
echo "=========================================="
echo "2. Python Backend Deployment Options"
echo "=========================================="
echo ""
echo "Choose one of the following options for the Python backend:"
echo ""
echo "Option A: Railway.app (Recommended)"
echo "  1. Go to https://railway.app"
echo "  2. Create new project from GitHub repo"
echo "  3. Set root directory: backend"
echo "  4. Add environment variables:"
echo "     - DATABASE_URL=\$DATABASE_URL"
echo "  5. Deploy"
echo ""
echo "Option B: Render.com"
echo "  1. Go to https://render.com"
echo "  2. Create new Web Service"
echo "  3. Connect GitHub repo"
echo "  4. Set:"
echo "     - Build Command: pip install -r requirements.txt"
echo "     - Start Command: uvicorn main:app --host 0.0.0.0 --port \$PORT"
echo "  5. Add environment variable: DATABASE_URL"
echo "  6. Deploy"
echo ""
echo "Option C: Fly.io"
echo "  1. Install flyctl: curl -L https://fly.io/install.sh | sh"
echo "  2. cd backend && fly launch"
echo "  3. Set DATABASE_URL secret: fly secrets set DATABASE_URL=your-neon-url"
echo ""
echo "=========================================="
echo "3. Configure Vercel Environment Variables"
echo "=========================================="
echo ""
echo "After deploying the Python backend, add this to Vercel:"
echo ""
echo "PYTHON_BACKEND_URL=https://your-python-backend-url"
echo ""
echo "Or use Vercel CLI:"
echo "  vercel env add PYTHON_BACKEND_URL"
echo ""
