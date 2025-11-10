# Weather Task System

A real-time weather data fetching and monitoring system built with Node.js, PostgreSQL, Redis, Bull Queue, and Next.js.

## Features

- 🌤️ **Automated Weather Fetching**: Scheduled jobs to fetch weather data for multiple cities
- 📊 **Job Queue Management**: Bull queue for reliable job processing
- 🔄 **Real-time Updates**: Socket.io for live weather data updates
- 📈 **Job History**: Track all weather fetch jobs with status and results
- 🐳 **Dockerized**: All services run in Docker containers
- 🗄️ **Auto Database Setup**: Database schema automatically initialized on first run

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Weather API key from [OpenWeatherMap](https://openweathermap.org/api)

### Setup

1. **Clone the repository** (if not already done)

2. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```bash
   # PostgreSQL Configuration
   POSTGRES_USER=solutionsquare
   POSTGRES_PASSWORD=weather_pass
   POSTGRES_DB=weather_db
   POSTGRES_PORT=5432

   # Redis Configuration
   REDIS_PORT=6379

   # Application Ports
   FRONTEND_PORT=3000
   SOCKET_PORT=3001

   # Weather API (Required)
   WEATHER_API_KEY=your_openweathermap_api_key_here

   # Optional: Schedule interval (default: 1 hour = 3600000ms)
   SCHEDULE_INTERVAL=3600000
   ```

3. **Build and start all services**

   ```bash
   docker compose up --build
   ```

   This single command will:
   - Build all Docker images (scheduler, worker, frontend)
   - Start PostgreSQL and automatically initialize the database schema
   - Start Redis for job queue
   - Start all application services

4. **Access the application**

   - **Frontend**: http://localhost:3000
   - **Socket.io Server**: http://localhost:3001
   - **PostgreSQL**: localhost:5432
   - **Redis**: localhost:6379

## Fresh Start (Reset Everything)

To start completely fresh (removes all data):

```bash
docker compose down -v
docker compose up --build
```

This will:
- Remove all containers and volumes
- Delete all database data
- Rebuild all images
- Initialize a fresh database with all tables

## Project Structure

```
weather-task/
├── docker-compose.yml          # Docker Compose configuration
├── .env                        # Environment variables (create this)
├── services/
│   ├── scheduler/              # Background job scheduler
│   │   ├── src/
│   │   │   ├── index.ts        # Main scheduler logic
│   │   │   └── config.ts       # Configuration
│   │   └── Dockerfile
│   ├── worker/                 # Job processor
│   │   ├── src/
│   │   │   ├── index.ts        # Worker logic
│   │   │   ├── config.ts       # Configuration
│   │   │   ├── socket-server.ts # Socket.io server
│   │   │   └── migrations/
│   │   │       ├── schema.sql  # Database schema
│   │   │       └── migrate.ts  # Migration script
│   │   └── Dockerfile
│   ├── frontend/               # Next.js frontend
│   │   ├── app/                # Next.js app directory
│   │   ├── lib/                # Utilities
│   │   └── Dockerfile
│   ├── shared/                 # Shared TypeScript types
│   │   └── types.ts
│   └── postgres/               # PostgreSQL initialization
│       └── init.sql            # Auto-runs on first start
└── README.md
```

## Services

### Scheduler
- **Purpose**: Schedules weather fetch jobs at regular intervals
- **Container**: `weather-scheduler`
- **Function**: Creates jobs in the Bull queue for all configured cities

### Worker
- **Purpose**: Processes weather fetch jobs from the queue
- **Container**: `weather-worker`
- **Ports**: 3001 (Socket.io)
- **Function**: 
  - Fetches weather data from OpenWeatherMap API
  - Saves data to PostgreSQL
  - Emits real-time updates via Socket.io

### Frontend
- **Purpose**: Web interface for monitoring and manual job creation
- **Container**: `weather-frontend`
- **Ports**: 3000
- **Features**:
  - Dashboard with job history
  - Manual "Fetch Weather Now" button
  - Real-time weather updates via Socket.io

### PostgreSQL
- **Purpose**: Database for storing cities, jobs, and weather data
- **Container**: `weather-postgres`
- **Ports**: 5432
- **Auto-initialization**: Schema is automatically created on first run

### Redis
- **Purpose**: Job queue backend for Bull
- **Container**: `weather-redis`
- **Ports**: 6379

## Database Schema

The database is automatically initialized with three main tables:

- **`cities`**: Stores city information (name, coordinates)
- **`jobs`**: Tracks all job executions (status, results, errors)
- **`weather_data`**: Stores fetched weather data linked to cities and jobs

## Common Commands

### Start Services
```bash
docker compose up -d
```

### Stop Services
```bash
docker compose stop
```

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f worker
docker compose logs -f scheduler
docker compose logs -f frontend
```

### Check Service Status
```bash
docker compose ps
```

### Access Database
```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U solutionsquare -d weather_db

# Check tables
docker compose exec postgres psql -U solutionsquare -d weather_db -c "\dt"

# View recent jobs
docker compose exec postgres psql -U solutionsquare -d weather_db -c "SELECT * FROM jobs ORDER BY created_at DESC LIMIT 5;"

# View recent weather data
docker compose exec postgres psql -U solutionsquare -d weather_db -c "SELECT * FROM weather_data ORDER BY timestamp DESC LIMIT 5;"
```

### Rebuild Services
```bash
docker compose build
docker compose up -d
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `solutionsquare` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `weather_pass` | PostgreSQL password |
| `POSTGRES_DB` | `weather_db` | Database name |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `REDIS_PORT` | `6379` | Redis port |
| `FRONTEND_PORT` | `3000` | Frontend port |
| `SOCKET_PORT` | `3001` | Socket.io port |
| `WEATHER_API_KEY` | _(required)_ | OpenWeatherMap API key |
| `SCHEDULE_INTERVAL` | `3600000` | Job schedule interval in milliseconds (1 hour) |

## Troubleshooting

### Services Not Starting

```bash
# Check logs for errors
docker compose logs

# Restart services
docker compose restart
```

### Database Connection Issues

```bash
# Check if PostgreSQL is healthy
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres

# Verify database tables exist
docker compose exec postgres psql -U solutionsquare -d weather_db -c "\dt"
```

### Port Conflicts

If you see "port already in use" errors:

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

### Fresh Database Setup

If you need to reset the database:

```bash
# Remove all volumes (deletes database)
docker compose down -v

# Start fresh
docker compose up --build
```

## Development

### Running Services Locally (without Docker)

If you prefer to run services locally:

1. **Start PostgreSQL and Redis locally**
   ```bash
   brew services start postgresql@15
   brew services start redis
   ```

2. **Update docker-compose.yml** to use `host.docker.internal` for database connections

3. **Run migrations**
   ```bash
   cd services/worker
   npm run migrate
   ```

4. **Start services**
   ```bash
   # Scheduler
   cd services/scheduler
   npm run dev

   # Worker
   cd services/worker
   npm run dev

   # Frontend
   cd services/frontend
   npm run dev
   ```

## API Endpoints

### Frontend API Routes

- `POST /api/job` - Create a manual weather fetch job
- `GET /api/jobs` - Get job history with pagination
- `GET /api/weather` - Get weather data with pagination
- `GET /api/weather/all` - Get all weather data

## License

ISC
