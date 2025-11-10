# Quick Start Guide

## One-Command Setup

To start everything from scratch (including fresh database):

```bash
docker compose down -v  # Remove all containers and volumes (fresh start)
docker compose up --build  # Build and start all services
```

That's it! The database will be automatically initialized with all tables.

## What Happens Automatically

1. **PostgreSQL** starts and automatically runs `services/postgres/init.sql` to create:
   - `cities` table
   - `jobs` table  
   - `weather_data` table
   - All indexes

2. **Redis** starts for job queue

3. **Scheduler** starts and begins scheduling weather jobs

4. **Worker** starts and processes jobs

5. **Frontend** starts at http://localhost:3000

## Services

- **Frontend**: http://localhost:3000
- **Worker Socket.io**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Check Status

```bash
# View all services
docker compose ps

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f worker
docker compose logs -f scheduler
docker compose logs -f frontend
```

## Fresh Start (Delete Everything)

```bash
docker compose down -v
docker compose up --build
```

This will:
- Remove all containers
- Remove all volumes (database data, Redis data)
- Rebuild all images
- Start everything fresh with empty database

## Database Access

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U weather_user -d weather_db

# Check tables
docker compose exec postgres psql -U weather_user -d weather_db -c "\dt"

# Check jobs
docker compose exec postgres psql -U weather_user -d weather_db -c "SELECT * FROM jobs ORDER BY created_at DESC LIMIT 5;"

# Check weather data
docker compose exec postgres psql -U weather_user -d weather_db -c "SELECT * FROM weather_data ORDER BY timestamp DESC LIMIT 5;"
```

## Environment Variables

Default values (can be overridden in `.env` file):

- `POSTGRES_USER=weather_user`
- `POSTGRES_PASSWORD=weather_pass`
- `POSTGRES_DB=weather_db`
- `POSTGRES_PORT=5432`
- `REDIS_PORT=6379`
- `FRONTEND_PORT=3000`
- `SOCKET_PORT=3001`
- `WEATHER_API_KEY` (required - set in `.env`)

## Troubleshooting

### Services Not Starting

```bash
# Check logs
docker compose logs

# Restart services
docker compose restart
```

### Database Not Initialized

The database is only initialized when the volume is first created. If you need to reinitialize:

```bash
docker compose down -v  # Remove volumes
docker compose up --build  # Start fresh
```

### Port Conflicts

If ports are already in use:

```bash
# Check what's using the ports
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :3000  # Frontend
lsof -i :3001  # Worker

# Stop local services if needed
brew services stop postgresql@15
brew services stop redis
```

