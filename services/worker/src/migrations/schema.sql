-- Start fresh: drop old tables if they exist (in dependency order)
DROP TABLE IF EXISTS weather_data CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS cities CASCADE;

-- Cities Table
CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs Table - Track job execution history
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(255) NOT NULL UNIQUE, -- Bull queue job ID (unique to allow upserts)
  job_type VARCHAR(50) NOT NULL, -- 'fetch-weather' or 'fetch-all-cities'
  city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
  city_name VARCHAR(100), -- Store city name for reference even if city is deleted
  status VARCHAR(20) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  result JSONB, -- Store job result data
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weather Data Table
CREATE TABLE IF NOT EXISTS weather_data (
  id SERIAL PRIMARY KEY,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL, -- Link to job that created this data
  temperature DECIMAL(5, 2) NOT NULL,
  humidity INTEGER NOT NULL,
  description VARCHAR(255) NOT NULL,
  wind_speed DECIMAL(5, 2),
  pressure INTEGER,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(city_id, timestamp)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
CREATE INDEX IF NOT EXISTS idx_jobs_job_id ON jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_city_id ON jobs(city_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weather_data_city_id ON weather_data(city_id);
CREATE INDEX IF NOT EXISTS idx_weather_data_job_id ON weather_data(job_id);
CREATE INDEX IF NOT EXISTS idx_weather_data_timestamp ON weather_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_weather_data_city_timestamp ON weather_data(city_id, timestamp DESC);

