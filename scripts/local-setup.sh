#!/bin/bash
# Local Development Setup Script for Gupta_Chat

set -e

echo "=== Gupta_Chat Local Development Setup ==="
echo ""

# Check prerequisites
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is not installed. Please install Node.js >= 18."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Error: npm is not installed."; exit 1; }

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "Error: Node.js version must be >= 18. Current: $(node --version)"
  exit 1
fi

echo "✓ Node.js $(node --version)"
echo "✓ npm $(npm --version)"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm run install:all
echo ""

# Setup frontend environment
echo "Setting up frontend environment..."
if [ ! -f frontend/.env ]; then
  cp frontend/.env.example frontend/.env
  echo "✓ Created frontend/.env from example"
else
  echo "⚠ frontend/.env already exists, skipping"
fi
echo ""

# Setup worker environment
echo "Setting up worker environment..."
if [ ! -f worker/.env ]; then
  cp worker/.env.example worker/.env
  echo "✓ Created worker/.env from example"
else
  echo "⚠ worker/.env already exists, skipping"
fi
echo ""

# Check wrangler installation
echo "Checking wrangler CLI..."
if command -v wrangler >/dev/null 2>&1; then
  echo "✓ wrangler $(wrangler --version)"
else
  echo "⚠ wrangler not found in PATH. Using npx wrangler instead."
fi
echo ""

echo "=== Setup Complete ==="
echo ""
echo "To start local development:"
echo "  npm run dev"
echo ""
echo "This will start:"
echo "  - Frontend: http://localhost:5173"
echo "  - Worker:   http://localhost:8787"
echo ""
echo "To run tests:"
echo "  npm run test"
echo ""
echo "For more information, see LOCAL_SETUP.md"
