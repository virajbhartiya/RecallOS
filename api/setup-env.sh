#!/bin/bash

# Setup environment file for RecallOS
echo "🚀 Setting up RecallOS environment..."

# Check if .env exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env file with default values
cat > .env << EOF
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/recallos"

# Redis Configuration
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD="redis"

# Application Configuration
NODE_ENV="development"
PORT=3000

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# API Configuration
API_VERSION="v1"
CORS_ORIGIN="http://localhost:3000"

# External Services
GEMINI_API_KEY=""
PRIVY_APP_SECRET=""

# Queue Configuration
QUEUE_CONCURRENCY=5

# Blockchain Configuration
MEMORY_REGISTRY_CONTRACT_ADDRESS=""
SEPOLIA_RPC_URL="https://1rpc.io/sepolia"
DEPLOYER_PRIVATE_KEY=""
ETHERSCAN_API_KEY=""
EOF

echo "✅ .env file created with default configuration"
echo ""
echo "📋 Next steps:"
echo "1. Start Docker Desktop"
echo "2. Run: npm run setup"
echo "3. Or manually:"
echo "   - npm run docker:up"
echo "   - npm run db:setup"
echo ""
echo "🔗 Database connection:"
echo "Host: localhost"
echo "Port: 5432"
echo "Database: recallos"
echo "User: postgres"
echo "Password: postgres"

