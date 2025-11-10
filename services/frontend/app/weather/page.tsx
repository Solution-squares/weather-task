'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import TableSkeleton from '@/components/ui/TableSkeleton';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import Pagination from '@/components/ui/Pagination';
import { formatTime, formatDate } from '@/lib/utils';
import { WeatherResponse } from '@/types/weather';
import { PAGINATION } from '@/lib/constants';

interface WeatherDataResponse {
  data: WeatherResponse[];
  lastSyncAt: string | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchWeatherData(page: number, limit: number): Promise<WeatherDataResponse> {
  const response = await fetch(`/api/weather?page=${page}&limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }
  return response.json();
}

export default function WeatherDataPage() {
  const [currentPage, setCurrentPage] = useState<number>(PAGINATION.DEFAULT_PAGE);
  const [pageSize] = useState<number>(PAGINATION.WEATHER_PAGE_SIZE);

  // Fetch latest data when page loads (no real-time updates)
  const { data, isLoading, error, refetch } = useQuery<WeatherDataResponse>({
    queryKey: ['weather', 'data', currentPage, pageSize],
    queryFn: () => fetchWeatherData(currentPage, pageSize),
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    enabled: true,
  });
  console.log(data?.data);

  // Data is already sorted by timestamp DESC (most recent first) from API
  const sortedData = data?.data || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Weather Data
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Latest weather data for all cities
              </p>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="p-6">
              <TableSkeleton rows={10} columns={4} />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
            <ErrorDisplay error={error} onRetry={() => refetch()} />
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        City Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Temperature
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Wind Speed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                    {sortedData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                          No weather data available
                        </td>
                      </tr>
                    ) : (
                      sortedData.map((weather) => (
                        <tr key={weather.current.location} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                            {weather.current.location}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                            {Math.round(weather.current.temperature)}°C
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                            {Math.round(weather.current.windSpeed)} km/h
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(weather.current.timestamp)} {formatTime(weather.current.timestamp)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {data?.pagination && (
                <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={data.pagination.totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                  />
                  <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, data.pagination.total)} of {data.pagination.total} cities
                  </div>
                </div>
              )}
            </div>

            {data?.lastSyncAt && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Last sync at{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDate(data.lastSyncAt)} {formatTime(data.lastSyncAt)}
                  </span>
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

