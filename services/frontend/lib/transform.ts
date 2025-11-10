// Transform database format to frontend format
import { DatabaseWeatherData } from '@/types/api';
import { WeatherResponse, WeatherData, Location } from '@/types/weather';

export function transformDatabaseToWeatherResponse(
  dbData: DatabaseWeatherData
): WeatherResponse {
  // Extract condition from description (first word, lowercase)
  const condition = dbData.description
    ? dbData.description.toLowerCase().split(' ')[0]
    : 'sunny';

  const weatherData: WeatherData = {
    location: dbData.cityName,
    temperature: dbData.temperature,
    condition,
    description: dbData.description || '',
    humidity: dbData.humidity || 0,
    windSpeed: dbData.windSpeed || 0,
    windDirection: 0, // Not in database, default to 0
    pressure: dbData.pressure || 0,
    visibility: 0, // Not in database, default to 0
    timestamp: dbData.timestamp || dbData.createdAt,
  };

  const location: Location = {
    name: dbData.cityName,
  };

  return {
    current: weatherData,
    location,
  };
}

export function transformDatabaseArrayToWeatherResponse(
  dbDataArray: DatabaseWeatherData[]
): WeatherResponse[] {
  return dbDataArray.map(transformDatabaseToWeatherResponse);
}

