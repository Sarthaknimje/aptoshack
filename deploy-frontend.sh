#!/bin/bash

# Frontend Deployment Script for Vercel

echo "🚀 Deploying Frontend to Vercel..."

# Build the project
echo "📦 Building project..."
npm run build

# Check if build succeeded
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Go to Vercel Dashboard: https://vercel.com/dashboard"
echo "2. Select your project → Settings → Environment Variables"
echo "3. Add VITE_BACKEND_URL with your backend URL"
echo "4. Redeploy if needed: vercel --prod"

