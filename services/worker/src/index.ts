import Queue from 'bull';
import { Pool } from 'pg';
import { config } from './config';
import { initializeSocketServer, emitWeatherUpdate, closeSocketServer } from './socket-server';
// Weather API Response type
interface WeatherAPIResponse {
  name: string;
  main: {
    temp: number;
    humidity: number;
    pressure?: number;
  };
  weather: Array<{
    description: string;
    main: string;
  }>;
  wind?: {
    speed: number;
  };
  dt: number;
}

console.log('Starting Weather Worker Service...');

// Create PostgreSQL connection pool
const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  user: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.database,
});

// Initialize Socket.io server
if (config.socket) {
initializeSocketServer(config.socket.port);
}

// Create Redis connection
const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
};

// Create queue
const weatherQueue = new Queue('weather-fetch', {
  redis: redisConfig,
});

// Handle queue events for debugging
weatherQueue.on('ready', () => {
  console.log('✅ Worker queue is ready and connected to Redis');
});

weatherQueue.on('error', (error) => {
  console.error('❌ Queue error:', error);
});

weatherQueue.on('waiting', (jobId) => {
  console.log(`⏳ Job ${jobId} is waiting to be processed`);
});

weatherQueue.on('active', (job) => {
  console.log(`🔄 Job ${job.id} is now active (processing): ${job.data.city || 'fetch-all-cities'}`);
});

weatherQueue.on('stalled', (job) => {
  console.log(`⚠️  Job ${job.id} has stalled`);
});

// Fetch weather data from OpenWeatherMap API
async function fetchWeatherData(city: string): Promise<WeatherAPIResponse> {
  const url = new URL(`${config.weatherAPI.baseURL}/weather`);
  url.searchParams.set('q', city);
  url.searchParams.set('appid', config.weatherAPI.apiKey);
  url.searchParams.set('units', 'metric');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<WeatherAPIResponse>;
}

// Ensure a city exists; insert or update and return its id
async function upsertCity(name: string, latitude?: number, longitude?: number): Promise<number> {
  // If no coordinates provided, fallback to 0 values to satisfy NOT NULL
  const lat = latitude ?? 0;
  const lon = longitude ?? 0;
  const upsertQuery = `
    INSERT INTO cities (name, latitude, longitude)
    VALUES ($1, $2, $3)
    ON CONFLICT (name) DO UPDATE SET
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `;
  const res = await pool.query(upsertQuery, [name, lat, lon]);
  return res.rows[0].id as number;
}

// Track job in database
async function trackJob(
  jobId: string,
  jobType: string,
  cityId: number | null,
  cityName: string | null,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  priority: number = 0,
  attempts: number = 0,
  errorMessage: string | null = null,
  result: any = null,
  startedAt: Date | null = null,
  completedAt: Date | null = null
): Promise<number> {
  const query = `
    INSERT INTO jobs (job_id, job_type, city_id, city_name, status, priority, attempts, max_attempts, error_message, result, started_at, completed_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (job_id) DO UPDATE SET
      city_id = COALESCE(EXCLUDED.city_id, jobs.city_id),
      city_name = COALESCE(EXCLUDED.city_name, jobs.city_name),
      status = EXCLUDED.status,
      attempts = EXCLUDED.attempts,
      error_message = EXCLUDED.error_message,
      result = EXCLUDED.result,
      started_at = COALESCE(EXCLUDED.started_at, jobs.started_at),
      completed_at = EXCLUDED.completed_at,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `;
  const values = [
    jobId,
    jobType,
    cityId,
    cityName,
    status,
    priority,
    attempts,
    3, // max_attempts
    errorMessage,
    result ? JSON.stringify(result) : null,
    startedAt,
    completedAt,
  ];
  const res = await pool.query(query, values);
  return res.rows[0].id as number;
}

// Save weather data to PostgreSQL, linked to city_id and job_id
async function saveWeatherData(
  data: WeatherAPIResponse,
  cityId: number,
  jobDbId: number | null = null
): Promise<void> {
  const insertQuery = `
    INSERT INTO weather_data (city_id, job_id, temperature, humidity, description, wind_speed, pressure, timestamp)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (city_id, timestamp) DO UPDATE SET
      job_id = COALESCE(EXCLUDED.job_id, weather_data.job_id),
      temperature = EXCLUDED.temperature,
      humidity = EXCLUDED.humidity,
      description = EXCLUDED.description,
      wind_speed = EXCLUDED.wind_speed,
      pressure = EXCLUDED.pressure,
      updated_at = CURRENT_TIMESTAMP
  `;
  const values = [
    cityId,
    jobDbId,
    data.main.temp,
    data.main.humidity,
    data.weather[0].description,
    data.wind?.speed || null,
    data.main.pressure || null,
    new Date(data.dt * 1000),
  ];
  await pool.query(insertQuery, values);
}

// Process weather fetch jobs
weatherQueue.process('fetch-weather', async (job) => {
  const { city, cityMetadata } = job.data;
  const jobId = job.id?.toString() || String(job.id);
  console.log(`Processing weather fetch for ${city}... (Job ID: ${jobId})`);

  let cityId: number | null = null;
  let jobDbId: number | null = null;
  const startTime = new Date();

  try {
    // Track job as processing (get the database ID)
    jobDbId = await trackJob(
      jobId,
      'fetch-weather',
      null,
      city,
      'processing',
      job.opts.priority || 0,
      job.attemptsMade || 0,
      null,
      null,
      startTime,
      null
    );

    // Fetch weather data from API
    const weatherData = await fetchWeatherData(city);
    console.log(`Fetched weather for ${city}: ${weatherData.main.temp}°C`);

    // Save to database with city metadata and link to job
    cityId = await upsertCity(weatherData.name, cityMetadata?.latitude, cityMetadata?.longitude);
    await saveWeatherData(weatherData, cityId, jobDbId);
    console.log(`Saved weather data for ${city} (linked to job DB ID: ${jobDbId})`);

    const result = { success: true, city, temperature: weatherData.main.temp };

    // Track job as completed (update with city_id)
    await trackJob(
      jobId,
      'fetch-weather',
      cityId,
      city,
      'completed',
      job.opts.priority || 0,
      job.attemptsMade || 0,
      null,
      result,
      startTime,
      new Date()
    );

    // Emit Socket.io update to frontend
    await emitWeatherUpdate(pool);

    return result;
  } catch (error: any) {
    console.error(`Error processing weather for ${city}:`, error.message);
    
    // Track job as failed (update with city_id if we have it)
    await trackJob(
      jobId,
      'fetch-weather',
      cityId,
      city,
      'failed',
      job.opts.priority || 0,
      job.attemptsMade || 0,
      error.message,
      null,
      startTime,
      new Date()
    );

    throw error;
  }
});

// Process fetch-all-cities job
weatherQueue.process('fetch-all-cities', async (job) => {
  const { cities } = job.data;
  const jobId = job.id?.toString() || String(job.id);
  console.log(`Processing weather fetch for ${cities.length} cities... (Job ID: ${jobId})`);

  const startTime = new Date();
  let jobDbId: number | null = null;

  try {
    // Track job as processing (get the database ID)
    jobDbId = await trackJob(
      jobId,
      'fetch-all-cities',
      null,
      null,
      'processing',
      job.opts.priority || 0,
      job.attemptsMade || 0,
      null,
      null,
      startTime,
      null
    );

    const results = [];
    for (const cityMetadata of cities) {
      try {
        // Fetch weather data from API
        const weatherData = await fetchWeatherData(cityMetadata.name);
        console.log(`Fetched weather for ${cityMetadata.name}: ${weatherData.main.temp}°C`);

        // Save to database with city metadata and link to job
        const cityId = await upsertCity(weatherData.name, cityMetadata?.latitude, cityMetadata?.longitude);
        await saveWeatherData(weatherData, cityId, jobDbId);
        console.log(`Saved weather data for ${cityMetadata.name} (linked to job DB ID: ${jobDbId})`);

        results.push({ success: true, city: cityMetadata.name, temperature: weatherData.main.temp });
      } catch (error: any) {
        console.error(`Error processing weather for ${cityMetadata.name}:`, error.message);
        results.push({ success: false, city: cityMetadata.name, error: error.message });
      }
    }

    const result = { success: true, results };

    // Track job as completed
    await trackJob(
      jobId,
      'fetch-all-cities',
      null,
      null,
      'completed',
      job.opts.priority || 0,
      job.attemptsMade || 0,
      null,
      result,
      startTime,
      new Date()
    );

    // Emit Socket.io update after processing all cities
    await emitWeatherUpdate(pool);

    return result;
  } catch (error: any) {
    console.error(`Error processing fetch-all-cities job:`, error.message);
    
    // Track job as failed
    await trackJob(
      jobId,
      'fetch-all-cities',
      null,
      null,
      'failed',
      job.opts.priority || 0,
      job.attemptsMade || 0,
      error.message,
      null,
      startTime,
      new Date()
    );

    throw error;
  }
});

// Process manual jobs (triggered from API)
weatherQueue.process('manual', async (job) => {
  const { city, cityMetadata, cities } = job.data;
  const jobId = job.id?.toString() || String(job.id);
  const startTime = new Date();
  let jobDbId: number | null = null;

  try {
    // Track job as processing (get the database ID)
    jobDbId = await trackJob(
      jobId,
      'manual',
      null,
      city || null,
      'processing',
      job.opts.priority || 0,
      job.attemptsMade || 0,
      null,
      null,
      startTime,
      null
    );

    // If a specific city is provided, fetch weather for that city
    if (city) {
      console.log(`Processing manual job for ${city}... (Job ID: ${jobId})`);
      
      // Fetch weather data from API
      const weatherData = await fetchWeatherData(city);
      console.log(`Fetched weather for ${city}: ${weatherData.main.temp}°C`);

      // Save to database with city metadata and link to job
      const cityId = await upsertCity(weatherData.name, cityMetadata?.latitude, cityMetadata?.longitude);
      await saveWeatherData(weatherData, cityId, jobDbId);
      console.log(`Saved weather data for ${city} (linked to job DB ID: ${jobDbId})`);

      const result = { success: true, city, temperature: weatherData.main.temp };

      // Track job as completed (update with city_id)
      await trackJob(
        jobId,
        'manual',
        cityId,
        city,
        'completed',
        job.opts.priority || 0,
        job.attemptsMade || 0,
        null,
        result,
        startTime,
        new Date()
      );

      // Emit Socket.io update to frontend
      await emitWeatherUpdate(pool);

      return result;
    } else {
      // If no city specified, fetch weather for all cities
      console.log(`Processing manual job for all cities... (Job ID: ${jobId})`);
      
      // Get cities from shared config if not provided in job data
      // Define default cities list (same as scheduler)
      const defaultCities = [
        { name: 'New York', latitude: 40.7128, longitude: -74.0060 },
        { name: 'London', latitude: 51.5074, longitude: -0.1278 },
        { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
        { name: 'Paris', latitude: 48.8566, longitude: 2.3522 },
        { name: 'Sydney', latitude: -33.8688, longitude: 151.2093 },
        { name: 'Cairo', latitude: 30.0444, longitude: 31.2357 },
        { name: 'Moscow', latitude: 55.7558, longitude: 37.6173 },
        { name: 'Dubai', latitude: 25.2048, longitude: 55.2708 },
        { name: 'Mumbai', latitude: 19.0760, longitude: 72.8777 },
        { name: 'Singapore', latitude: 1.3521, longitude: 103.8198 },
        { name: 'Los Angeles', latitude: 34.0522, longitude: -118.2437 },
        { name: 'Toronto', latitude: 43.6532, longitude: -79.3832 },
      ];
      const citiesToProcess = cities || defaultCities;
      const results = [];

      for (const cityMetadata of citiesToProcess) {
        try {
          // Fetch weather data from API
          const weatherData = await fetchWeatherData(cityMetadata.name);
          console.log(`Fetched weather for ${cityMetadata.name}: ${weatherData.main.temp}°C`);

          // Save to database with city metadata and link to job
          const cityId = await upsertCity(weatherData.name, cityMetadata?.latitude, cityMetadata?.longitude);
          await saveWeatherData(weatherData, cityId, jobDbId);
          console.log(`Saved weather data for ${cityMetadata.name} (linked to job DB ID: ${jobDbId})`);

          results.push({ success: true, city: cityMetadata.name, temperature: weatherData.main.temp });
        } catch (error: any) {
          console.error(`Error processing weather for ${cityMetadata.name}:`, error.message);
          results.push({ success: false, city: cityMetadata.name, error: error.message });
        }
      }

      const result = { success: true, results };

      // Track job as completed
      await trackJob(
        jobId,
        'manual',
        null,
        null,
        'completed',
        job.opts.priority || 0,
        job.attemptsMade || 0,
        null,
        result,
        startTime,
        new Date()
      );

      // Emit Socket.io update after processing all cities
      await emitWeatherUpdate(pool);

      return result;
    }
  } catch (error: any) {
    console.error(`Error processing manual job:`, error.message);
    
    // Track job as failed
    await trackJob(
      jobId,
      'manual',
      null,
      city || null,
      'failed',
      job.opts.priority || 0,
      job.attemptsMade || 0,
      error.message,
      null,
      startTime,
      new Date()
    );

    throw error;
  }
});

// Handle queue events
weatherQueue.on('completed', (job, result) => {
  if (result.city) {
    console.log(`Job ${job.id} completed: ${result.city} - ${result.temperature}°C`);
  } else {
    console.log(`Job ${job.id} completed: ${result.results?.length || 0} cities processed`);
  }
});

weatherQueue.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed for ${job?.data?.city || 'manual'}:`, err.message);
});

weatherQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down worker...');
  await weatherQueue.close();
  await closeSocketServer();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Log queue status on startup
async function logQueueStatus() {
  try {
    const counts = await weatherQueue.getJobCounts();
    console.log('📊 Queue status:', {
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
    });
    
    // Log that processors are registered
    console.log('📋 Processors registered: fetch-weather, fetch-all-cities, manual');
  } catch (error: any) {
    console.error('❌ Error getting queue status:', error.message);
  }
}

// Log status after a short delay to allow queue to initialize
setTimeout(() => {
  logQueueStatus();
}, 2000);

console.log('Weather worker started and waiting for jobs...');
console.log('✅ Registered processors: fetch-weather, fetch-all-cities, manual');

