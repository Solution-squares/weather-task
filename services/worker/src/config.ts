import dotenv from 'dotenv';
import { EnvironmentConfig } from '../../shared/types';

dotenv.config({ path: '../../.env' });

/**
 * Environment configuration with TypeScript interface
 */
export const config: EnvironmentConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'weather_user',
    password: process.env.POSTGRES_PASSWORD || 'weather_pass',
    database: process.env.POSTGRES_DB || 'weather_db',
  },
  weatherAPI: {
    apiKey: process.env.WEATHER_API_KEY || '',
    baseURL: 'https://api.openweathermap.org/data/2.5',
  },
  schedule: {
    interval: parseInt(process.env.SCHEDULE_INTERVAL || '3600000', 10),
  },
  socket: {
    port: parseInt(process.env.SOCKET_PORT || '3001', 10),
    frontendURL: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
} as const;

