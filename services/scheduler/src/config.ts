import dotenv from 'dotenv';
import { CityMetadata, EnvironmentConfig } from '../../shared/types';

dotenv.config({ path: '../../.env' });

/**
 * City metadata with name, latitude, and longitude
 */
export const cities: CityMetadata[] = [
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

/**
 * Scheduler configuration (subset of EnvironmentConfig)
 */
export const config = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  schedule: {
    interval: parseInt(process.env.SCHEDULE_INTERVAL || '3600000', 10), // Default: 1 hour
  },
  cities,
} as const;

