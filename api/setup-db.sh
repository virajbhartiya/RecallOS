#!/bin/bash

# RecallOS Database Setup Script
echo "🚀 Setting up RecallOS PostgreSQL Database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start PostgreSQL container
echo "📦 Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec recallos_db pg_isready -U recall_user -d recallos > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Install pgvector extension
echo "🔧 Installing pgvector extension..."
docker exec recallos_db psql -U recall_user -d recallos -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Install uuid-ossp extension
echo "🔧 Installing uuid-ossp extension..."
docker exec recallos_db psql -U recall_user -d recallos -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# Generate Prisma client
echo "🔨 Generating Prisma client..."
npm run db:generate

# Run database migrations
echo "📊 Running database migrations..."
npm run db:migrate

echo "🎉 Database setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy .env.example to .env and update DATABASE_URL if needed"
echo "2. Start the API server: npm start"
echo "3. Access Prisma Studio: npm run db:studio"
echo ""
echo "🔗 Database connection:"
echo "Host: localhost"
echo "Port: 5432"
echo "Database: recallos"
echo "User: recall_user"
echo "Password: securepassword"
