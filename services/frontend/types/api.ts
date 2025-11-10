// API response types matching the backend format
export interface DatabaseWeatherData {
  id: number;
  cityId: number;
  cityName: string;
  temperature: number;
  humidity: number;
  description: string;
  windSpeed?: number;
  pressure?: number;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseJob {
  id: number;
  jobId: string;
  jobType: string;
  cityId?: number;
  cityName?: string;
  status: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  errorMessage?: string;
  result?: any;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiWeatherResponse {
  success: boolean;
  data: DatabaseWeatherData | DatabaseWeatherData[];
  count?: number;
  lastSyncAt?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
}

export interface CitiesResponse {
  success: boolean;
  data: string[];
}

