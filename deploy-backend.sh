#!/bin/bash

# Backend Deployment Script for Railway

echo "🚀 Deploying Backend to Railway..."

cd backend

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login to Railway (interactive)
echo "🔐 Please login to Railway..."
railway login

# Initialize Railway project (if not already)
if [ ! -f ".railway/railway.toml" ]; then
    echo "📝 Initializing Railway project..."
    railway init
fi

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Go to Railway Dashboard: https://railway.app/dashboard"
echo "2. Select your project → Variables"
echo "3. Add all environment variables from backend/env.template"
echo "4. Get your backend URL from Railway dashboard"
echo "5. Update frontend VITE_BACKEND_URL with Railway URL"

