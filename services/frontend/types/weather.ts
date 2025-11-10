// Shared weather types
export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  visibility: number;
  uvIndex?: number;
  feelsLike?: number;
  icon?: string;
  timestamp: string;
}

export interface WeatherForecast {
  date: string;
  high: number;
  low: number;
  condition: string;
  description: string;
  icon?: string;
  precipitation?: number;
}

export interface Location {
  name: string;
  country?: string;
  lat?: number;
  lon?: number;
}

export interface WeatherResponse {
  current: WeatherData;
  forecast?: WeatherForecast[];
  location: Location;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

