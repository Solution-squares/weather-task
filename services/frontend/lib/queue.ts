// Using dynamic import to avoid bundling bull during build
// Bull is a Node.js-only library that doesn't work in Next.js build process
type Queue = any; // Type will be inferred from dynamic import

let weatherQueue: Queue | null = null;

export async function getQueue(): Promise<Queue> {
  if (!weatherQueue) {
    // Dynamic import to avoid bundling bull during build
    const Bull = (await import('bull')).default;
    
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    };

    weatherQueue = new Bull('weather-fetch', {
      redis: redisConfig,
    });
  }

  return weatherQueue;
}

export async function closeQueue(): Promise<void> {
  if (weatherQueue) {
    await weatherQueue.close();
    weatherQueue = null;
  }
}

