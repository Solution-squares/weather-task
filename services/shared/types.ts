/**
 * Shared types for Weather Services
 */

/**
 * City metadata with name, latitude, and longitude
 */
export interface CityMetadata {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Environment configuration interface
 */
export interface EnvironmentConfig {
  redis: {
    host: string;
    port: number;
  };
  postgres: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  weatherAPI: {
    apiKey: string;
    baseURL: string;
  };
  schedule: {
    interval: number;
  };
  socket?: {
    port: number;
    frontendURL: string;
  };
}

export interface WeatherData {
  id?: number;
  city: string;
  latitude?: number;
  longitude?: number;
  temperature: number;
  humidity: number;
  description: string;
  windSpeed?: number;
  pressure?: number;
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Job payload interface with city metadata
 */
export interface WeatherJob {
  city: string;
  cityMetadata?: CityMetadata;
  priority?: number;
}

export interface WeatherAPIResponse {
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

