#!/bin/bash

# HyperIndex Setup Script for RecallOS
# This script sets up the HyperIndex environment and starts the indexer

set -e

echo "🚀 Setting up RecallOS HyperIndex"
echo "================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the hyperindex directory."
    exit 1
fi

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v22 or newer."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js v22 or newer."
    exit 1
fi
echo "✅ Node.js $(node -v) is installed"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi
echo "✅ pnpm $(pnpm -v) is installed"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi
echo "✅ Docker is running"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Set up environment variables
echo "🔧 Setting up environment variables..."
if [ ! -f ".env" ]; then
    cat > .env << EOF
# Envio HyperIndex Configuration
ENVIO_API_TOKEN=your_api_token_here
SEPOLIA_RPC_URL=https://eth-sepolia.public.blastapi.io
CONTRACT_ADDRESS=0xde662d9c6a0bb41ad82b3550177feaf4e43bd602
EOF
    echo "✅ Created .env file with default values"
    echo "⚠️  Please update the ENVIO_API_TOKEN in .env with your actual API token"
else
    echo "✅ .env file already exists"
fi

# Generate code
echo "🔨 Generating indexer code..."
pnpm envio codegen

# Test the setup
echo "🧪 Testing the setup..."
if [ -f "test-integration.js" ]; then
    echo "Running integration test..."
    node test-integration.js || echo "⚠️  Integration test failed - this is expected if the indexer isn't running yet"
fi

echo ""
echo "🎉 HyperIndex setup completed!"
echo ""
echo "Next steps:"
echo "1. Update your ENVIO_API_TOKEN in .env (get one from https://dashboard.envio.dev)"
echo "2. Start the indexer: pnpm dev"
echo "3. The Hasura dashboard will be available at http://localhost:8080"
echo "4. Admin password: testing"
echo ""
echo "To test the integration:"
echo "  node test-integration.js [user_address]"
echo ""
echo "To stop the indexer:"
echo "  pnpm stop"
