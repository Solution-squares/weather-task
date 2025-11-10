import Queue from 'bull';
import { config } from './config';

console.log('Starting Weather Scheduler Service...');

// Create Redis connection
// Note: Bull doesn't allow enableReadyCheck or maxRetriesPerRequest
const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  retryStrategy: (times: number) => {
    if (times > 3) {
      console.error('❌ Redis connection failed after 3 retries');
      return null; // Stop retrying
    }
    console.log(`Retrying Redis connection (attempt ${times})...`);
    return Math.min(times * 200, 2000);
  },
  connectTimeout: 5000,
};

// Create queue
const weatherQueue = new Queue('weather-fetch', {
  redis: redisConfig,
});

// Handle Redis connection errors
weatherQueue.on('error', (error) => {
  console.error('❌ Queue error:', error);
});

weatherQueue.on('waiting', (jobId) => {
  console.log(`Job ${jobId} is waiting`);
});

weatherQueue.on('active', (job) => {
  console.log(`Job ${job.id} is now active`);
});

// Schedule jobs for each city
async function scheduleWeatherJobs() {
  console.log(`Scheduling weather jobs for ${config.cities.length} cities...`);
  
  try {
    // Schedule initial jobs for all cities immediately
    for (const cityMetadata of config.cities) {
      try {
        await weatherQueue.add(
          'fetch-weather',
          { 
            city: cityMetadata.name,
            cityMetadata: cityMetadata,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          }
        );
        console.log(`✅ Scheduled initial job for ${cityMetadata.name}`);
      } catch (error: any) {
        console.error(`❌ Failed to schedule job for ${cityMetadata.name}:`, error.message);
      }
    }
    
    // Schedule a repeat job that processes all cities
    await weatherQueue.add(
      'fetch-all-cities',
      { cities: config.cities },
      {
        repeat: { 
          every: config.schedule.interval,
          key: 'weather-all-cities'
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
    console.log('✅ Scheduled repeat job for all cities');
  } catch (error: any) {
    console.error('❌ Error scheduling jobs:', error.message);
    throw error;
  }
}

// Handle queue events
weatherQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed for ${job.data.city}`);
});

weatherQueue.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed for ${job?.data?.city}:`, err.message);
});

// Test Redis connection before scheduling
async function testRedisConnection(): Promise<boolean> {
  try {
    // Try to get queue info - this will fail if Redis is not connected
    const queueInfo = await weatherQueue.getJobCounts();
    console.log('✅ Redis connection successful');
    return true;
  } catch (error: any) {
    console.error('❌ Redis connection failed:', error.message);
    return false;
  }
}

// Start scheduling
async function startScheduler() {
  console.log('Connecting to Redis...');
  
  // Test connection first
  const connected = await testRedisConnection();
  if (!connected) {
    console.error('❌ Cannot connect to Redis. Please ensure Redis is running.');
    console.error(`   Expected Redis at ${config.redis.host}:${config.redis.port}`);
    process.exit(1);
  }

  // Now schedule jobs
  try {
    await scheduleWeatherJobs();
    console.log('✅ Weather scheduler started successfully!');
    console.log(`Jobs will run every ${config.schedule.interval / 1000 / 60} minutes`);
  } catch (error: any) {
    console.error('❌ Failed to schedule jobs:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

startScheduler();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing queue...');
  await weatherQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing queue...');
  await weatherQueue.close();
  process.exit(0);
});

