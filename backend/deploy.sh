#!/bin/bash
# deploy.sh

echo "🚀 Deploying VeryTippers Backend..."

# Build Docker images
docker-compose build

# Run database migrations
docker-compose run --rm backend npm run migrate:run

# Start services
docker-compose up -d

# Check service health
sleep 10
docker-compose ps

echo "✅ Deployment complete!"
echo "📊 Check logs: docker-compose logs -f backend"
echo "🩺 Health check: curl http://localhost:3000/api/health"

