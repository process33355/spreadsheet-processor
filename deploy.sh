#!/bin/bash

# Spreadsheet Processor Deployment Script
echo "🚀 Starting deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎉 Your app is ready for deployment!"
    echo ""
    echo "Next steps:"
    echo "1. Push your code to GitHub:"
    echo "   git add ."
    echo "   git commit -m 'Ready for deployment'"
    echo "   git push origin main"
    echo ""
    echo "2. Deploy to Vercel (recommended):"
    echo "   - Go to https://vercel.com"
    echo "   - Sign up/Login with GitHub"
    echo "   - Click 'New Project'"
    echo "   - Import your repository"
    echo "   - Deploy automatically"
    echo ""
    echo "3. Or deploy to Netlify:"
    echo "   - Go to https://netlify.com"
    echo "   - Drag and drop the .next folder"
    echo ""
    echo "💡 Cost-saving tips:"
    echo "   - Vercel free tier: 100GB bandwidth/month"
    echo "   - All processing happens in the browser (no server costs)"
    echo "   - Files are not stored on the server"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi 