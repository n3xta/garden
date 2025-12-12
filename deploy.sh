#!/bin/bash

# Quick Deploy Script for Cloudflare Pages
# Usage: ./deploy.sh

echo "🌱 Building Garden for deployment..."

# Install dependencies
npm install

# Run build
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📦 Build output is in ./dist directory"
    echo ""
    echo "Next steps:"
    echo "1. Push to Git: git add . && git commit -m 'Deploy' && git push"
    echo "2. Or use Wrangler: wrangler pages deploy dist --project-name=garden"
else
    echo "❌ Build failed. Check the errors above."
    exit 1
fi

